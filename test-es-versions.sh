#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Elasticsearch version compatibility tests...${NC}\n"

# Function to wait for Elasticsearch
wait_for_es() {
    local port=$1
    local version=$2
    echo -e "Waiting for Elasticsearch $version on port $port..."
    for i in {1..30}; do
        if curl -s "http://localhost:$port/_cluster/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Elasticsearch $version is ready${NC}"
            return 0
        fi
        sleep 2
    done
    echo -e "${RED}✗ Elasticsearch $version failed to start${NC}"
    return 1
}

# Function to run tests
run_tests() {
    local port=$1
    local version=$2
    echo -e "\n${YELLOW}Testing against Elasticsearch $version (port $port)${NC}"
    ES_VERSION=$version ELASTICSEARCH_URL=http://localhost:$port npm test
    return $?
}

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose-multi.yml down -v

# Start both Elasticsearch versions
echo -e "\n${YELLOW}Starting Elasticsearch 8 and 9...${NC}"
docker-compose -f docker-compose-multi.yml up -d

# Wait for both to be ready
wait_for_es 9201 "8.15.0"
ES8_READY=$?

wait_for_es 9202 "9.0.0"
ES9_READY=$?

if [ $ES8_READY -ne 0 ] || [ $ES9_READY -ne 0 ]; then
    echo -e "${RED}Failed to start Elasticsearch containers${NC}"
    docker-compose -f docker-compose-multi.yml logs
    docker-compose -f docker-compose-multi.yml down -v
    exit 1
fi

# Run tests against ES 8
echo -e "\n${YELLOW}================================${NC}"
echo -e "${YELLOW}Testing Elasticsearch 8.15.0${NC}"
echo -e "${YELLOW}================================${NC}"
run_tests 9201 "8.15.0"
ES8_RESULT=$?

# Run tests against ES 9
echo -e "\n${YELLOW}================================${NC}"
echo -e "${YELLOW}Testing Elasticsearch 9.0.0${NC}"
echo -e "${YELLOW}================================${NC}"
run_tests 9202 "9.0.0"
ES9_RESULT=$?

# Clean up
echo -e "\n${YELLOW}Cleaning up...${NC}"
docker-compose -f docker-compose-multi.yml down -v

# Report results
echo -e "\n${YELLOW}================================${NC}"
echo -e "${YELLOW}Test Results Summary${NC}"
echo -e "${YELLOW}================================${NC}"

if [ $ES8_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Elasticsearch 8.15.0: All tests passed${NC}"
else
    echo -e "${RED}✗ Elasticsearch 8.15.0: Tests failed${NC}"
fi

if [ $ES9_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Elasticsearch 9.0.0: All tests passed${NC}"
else
    echo -e "${RED}✗ Elasticsearch 9.0.0: Tests failed${NC}"
fi

# Exit with appropriate code
if [ $ES8_RESULT -ne 0 ] || [ $ES9_RESULT -ne 0 ]; then
    exit 1
fi

echo -e "\n${GREEN}All tests passed for both versions!${NC}"
exit 0
