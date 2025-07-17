#!/bin/bash

LOG_FILE="pnpm_dev.log"

nohup pnpm dev > "$LOG_FILE" 2>&1 &
PID=$!

echo "pnpm dev se está ejecutando en segundo plano con PID: $PID"
echo "Log: $LOG_FILE"