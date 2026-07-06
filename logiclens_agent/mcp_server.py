"""LogicLens passive security MCP server."""

from mcp.server.fastmcp import FastMCP

from .passive_tools import (
    extract_public_links,
    inspect_http_url,
    inspect_security_headers,
    inspect_tls_certificate,
    request_active_test,
)

mcp = FastMCP("logiclens-passive-security")

mcp.tool()(inspect_http_url)
mcp.tool()(inspect_security_headers)
mcp.tool()(extract_public_links)
mcp.tool()(inspect_tls_certificate)
mcp.tool()(request_active_test)


if __name__ == "__main__":
    mcp.run(transport="stdio")
