import { create } from 'zustand';
import wsClient from '../services/websocket';

const INITIAL_AGENTS = [
  { id: 'Planner', name: 'Planner', role: 'Strategy & Scoping', status: 'idle', confidence: 0, info: 'Idle' },
  { id: 'Recon', name: 'Live HTTP Inspector', role: 'Bounded MCP GET/HEAD', status: 'idle', confidence: 0, info: 'Idle' },
  { id: 'Tech Fingerprint', name: 'Header & TLS Review', role: 'Deterministic configuration checks', status: 'idle', confidence: 0, info: 'Idle' },
  { id: 'JS Analysis', name: 'Script Inventory', role: 'Public references only', status: 'idle', confidence: 0, info: 'Idle' },
  { id: 'API Discovery', name: 'Link Inventory', role: 'Extracted links; no probing', status: 'idle', confidence: 0, info: 'Idle' },
  { id: 'Authentication', name: 'Cookie Review', role: 'Observed attributes only', status: 'idle', confidence: 0, info: 'Idle' },
  { id: 'Workflow Learning', name: 'Evidence Correlation', role: 'Tool evidence aggregation', status: 'idle', confidence: 0, info: 'Idle' },
  { id: 'Business Logic', name: 'Business Logic', role: 'Skipped without active evidence', status: 'idle', confidence: 0, info: 'Idle' },
];

const resetAgents = () => INITIAL_AGENTS.map((agent) => ({
  ...agent,
  status: 'idle',
  confidence: 0,
  info: 'Idle',
}));

export const useScanStore = create((set, get) => ({
  scans: [],
  currentScan: null,
  agents: resetAgents(),
  findings: [],
  events: [],
  debates: [],
  attackChains: [],
  executionPlan: null,
  currentPhase: 'Initialization',
  isConnected: false,
  scanProgress: 0,
  elapsedTime: 0,

  setScans: (scans) => set({ scans }),
  setCurrentScan: (scan) => set({ currentScan: scan }),
  setConnected: (isConnected) => set({ isConnected }),
  setScanProgress: (scanProgress) => set({ scanProgress }),
  setElapsedTime: (elapsedTime) => set({ elapsedTime }),

  hydrateFromScan: (scan) => {
    const report = scan?.report_data || {};
    const liveFindings = Array.isArray(report.findings) ? report.findings : [];
    const liveAgents = report.agent_summary
      ? get().agents.map((agent) => ({
          ...agent,
          status: (report.agent_summary[agent.id] || agent.status || 'idle').toLowerCase(),
        }))
      : get().agents;

    set({
      currentScan: scan,
      findings: liveFindings,
      attackChains: Array.isArray(report.attack_chains) ? report.attack_chains : [],
      agents: liveAgents,
      currentPhase: report.current_phase || (scan.status === 'completed' ? 'Completed' : 'Initialization'),
      scanProgress: scan.status === 'completed' ? 100 : report.current_phase ? 75 : 0,
    });
  },

  joinScan: (scanId, options = {}) => {
    if (!options.preserveState) {
      get().resetScanState();
    }
    wsClient.connect(scanId);
    wsClient.on('message', get().handleWebSocketMessage);
    wsClient.on('connected', () => get().setConnected(true));
    wsClient.on('disconnected', () => get().setConnected(false));
  },

  leaveScan: () => {
    wsClient.disconnect();
    get().setConnected(false);
  },

  updateAgentStatus: (agentId, updates) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, ...updates } : agent
      ),
    })),

  addEvent: (event) =>
    set((state) => ({
      events: [
        ...state.events,
        {
          id: event.id || crypto.randomUUID(),
          timestamp: event.timestamp || new Date().toISOString(),
          ...event,
        },
      ],
    })),

  resetScanState: () =>
    set({
      currentScan: null,
      agents: resetAgents(),
      findings: [],
      events: [],
      debates: [],
      attackChains: [],
      executionPlan: null,
      currentPhase: 'Initialization',
      scanProgress: 0,
      elapsedTime: 0,
    }),

  handleWebSocketMessage: (data) => {
    const { type } = data;

    switch (type) {
      case 'agent_status': {
        const status = (data.status || '').toLowerCase();
        get().updateAgentStatus(data.agent_name, {
          status,
          confidence: data.confidence || 0,
          info: data.info || '',
        });

        if (data.status === 'RUNNING') {
          get().addEvent({
            type: 'agent_started',
            agent: data.agent_name,
            message: `${data.agent_name} started: ${data.info || 'performing audit'}`,
          });
        } else if (data.status === 'COMPLETED') {
          get().addEvent({
            type: 'agent_completed',
            agent: data.agent_name,
            message: `${data.agent_name} completed scanning.`,
          });
        } else if (data.status === 'SKIPPED') {
          get().addEvent({
            type: 'agent_skipped',
            agent: data.agent_name,
            message: `${data.agent_name} skipped: ${data.info || 'not enabled for this scan'}`,
          });
        } else if (data.status === 'FAILED') {
          get().addEvent({
            type: 'agent_failed',
            agent: data.agent_name,
            message: `${data.agent_name} failed: ${data.info || 'agent execution failed'}`,
          });
        }
        break;
      }

      case 'phase_start': {
        set({ currentPhase: data.phase });
        let progress = 10;
        if (data.phase === 'Reconnaissance') progress = 20;
        if (data.phase === 'API & Code Audit') progress = 45;
        if (data.phase === 'Logic & Auth Checks') progress = 70;
        if (data.phase === 'Peer-Review Debate') progress = 80;
        if (data.phase === 'Evidence Validation') progress = 85;
        if (data.phase === 'Attack Chain Analysis') progress = 90;
        if (data.phase === 'Report Assembly') progress = 95;
        set({ scanProgress: progress });

        get().addEvent({
          type: 'phase_change',
          message: `Entering phase: ${data.phase} - ${data.message}`,
        });
        break;
      }

      case 'plan_created':
        set({ executionPlan: data.plan });
        get().addEvent({
          type: 'plan_created',
          message: `Execution strategy plan created with ${data.plan?.phases?.length || 0} phases.`,
        });
        break;

      case 'finding_new':
        set((state) => ({
          findings: [...state.findings, { ...data.finding, id: crypto.randomUUID() }],
        }));
        get().addEvent({
          type: 'finding_new',
          message: `Discovered new ${data.finding.severity} vulnerability: ${data.finding.title}`,
          severity: data.finding.severity,
        });
        break;

      case 'debate_start':
        get().addEvent({
          type: 'debate_start',
          message: `Peer debate started on "${data.finding_title}" between ${data.advocate} and ${data.challenger}.`,
        });
        break;

      case 'debate_complete':
        set((state) => ({
          debates: [...state.debates, {
            id: crypto.randomUUID(),
            finding_title: data.finding_title,
            verdict: data.verdict,
            final_severity: data.final_severity,
            rationale: data.rationale,
            transcript: data.transcript,
          }],
          findings: state.findings.map((finding) =>
            finding.title === data.finding_title
              ? { ...finding, severity: data.final_severity, debate_status: data.verdict, debate_summary: data.rationale }
              : finding
          ),
        }));

        get().addEvent({
          type: 'debate_complete',
          message: `Debate verdict: "${data.finding_title}" was ${data.verdict} as ${data.final_severity}.`,
        });
        break;

      case 'attack_chains_created':
        set({ attackChains: data.chains });
        get().addEvent({
          type: 'chains_created',
          message: `Generated ${data.chains?.length || 0} composite exploit attack chains.`,
        });
        break;

      case 'scan_complete':
        set({ scanProgress: 100, currentScan: data.report, currentPhase: 'Completed' });
        get().addEvent({
          type: 'scan_complete',
          message: 'Scan task completed successfully. Full consensus report compiled.',
        });
        break;

      case 'scan_failed':
        get().addEvent({
          type: 'scan_failed',
          message: `Scan execution failed: ${data.error}`,
        });
        break;

      default:
        break;
    }
  },
}));

export default useScanStore;
