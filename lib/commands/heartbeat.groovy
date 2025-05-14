def watchIds = ctx.payload.env.watchIds;
def shouldSendMessage = false;
def watchMessages = new HashMap();

String buildMessage(String watchId, def execution, String item) {
  def executionResult = execution.result;

  return String.format(
    "Watch ID: %s, %s failed: %s, Execution state: %s, Error type: %s, Error reason: %s",
    new def[] {
      watchId,
      item,
      executionResult[item].status,
      execution.state,
      executionResult[item].error.type,
      executionResult[item].error.reason
    }
  );
}

for (watchId in watchIds) {
  def messages = [];
  def executions = ctx.payload[watchId].hits.hits;

  for (execution in executions) {
    if (execution.state == 'execution_not_needed') continue;

    def executionResult = execution.result;
    def inputFailed = executionResult.input != null && executionResult.input.status != 'success';
    def conditionFailed = executionResult.condition != null && executionResult.condition.status != 'success';

    if (inputFailed) {
      shouldSendMessage = true;
      messages.add(
        buildMessage(
          watchId,
          execution,
          'input'
        )
      );
      break;
    }

    if (conditionFailed) {
     shouldSendMessage = true;
      messages.add(
        buildMessage(
          watchId,
          execution,
          'condition'
        )
      );
      break;
    }

    if (execution.state == 'failed' && !shouldSendMessage) {
      shouldSendMessage = true;
      messages.add(
        String.format(
          "Watch ID %s failed due to an unkown cause. Execution state: %s",
          new def[] {
            watchId,
            execution.state
          }
        )
      );
      break;
    }
  }

  watchMessages.put(watchId, messages);
}

return [
  'shouldSendMessage': shouldSendMessage,
  'watchMessages': watchMessages
];
