#!/bin/bash
echo "=== KawanBelanja Docker Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "kb-"

echo ""
echo "=== Resource Usage ==="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep "kb-"
