"""
LogicLens AI - WebSocket Connection Manager

Allows the frontend to connect via WebSocket and listen to real-time agent updates.
"""

import json
import logging
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("logiclens.api.websocket")


class ConnectionManager:
    """Manages active WebSocket connections grouped by scan ID."""

    def __init__(self):
        # Maps scan_id (int) -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, scan_id: int, websocket: WebSocket):
        """Accept a websocket connection and register it to a scan_id room."""
        await websocket.accept()
        if scan_id not in self.active_connections:
            self.active_connections[scan_id] = []
        self.active_connections[scan_id].append(websocket)
        logger.info("New WebSocket connection for scan %s. Total connections: %d", 
                    scan_id, len(self.active_connections[scan_id]))

    def disconnect(self, scan_id: int, websocket: WebSocket):
        """Remove a websocket connection from the scan_id room."""
        if scan_id in self.active_connections:
            if websocket in self.active_connections[scan_id]:
                self.active_connections[scan_id].remove(websocket)
                logger.info("WebSocket disconnected from scan %s. Connections remaining: %d", 
                            scan_id, len(self.active_connections[scan_id]))
            if not self.active_connections[scan_id]:
                del self.active_connections[scan_id]

    async def broadcast_to_scan(self, scan_id: int, message: dict):
        """Broadcast a message as JSON to all subscribers of a scan_id."""
        if scan_id in self.active_connections:
            connections = list(self.active_connections[scan_id])
            logger.info("Broadcasting update to %d clients for scan %s: %s", 
                        len(connections), scan_id, message.get("type"))
            
            # Serialize dates if any
            payload = json.dumps(message, default=str)
            
            for connection in connections:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.error("Failed to send WebSocket message: %s. Disconnecting.", e)
                    self.disconnect(scan_id, connection)


manager = ConnectionManager()
