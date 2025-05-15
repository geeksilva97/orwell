def watchIds = ctx.payload.env.watchIds;
def shouldSendMessage = false;
def watchMessages = new HashMap();

for (watchId in watchIds) {
  def messages = [];
  def executions = ctx.payload[watchId].hits.hits;

  for (e in executions) {
    def execution = e._source;
    def executionResult = execution.result;
    def inputStatus = executionResult.input != null ? executionResult.input.status : '(none)';
    def conditionStatus = executionResult.condition != null ? executionResult.condition.status : '(none)';

    message.add(
      String.format(
        "Watch ID %s, Execution state: %s" + newLineChar + "* Input: %s" + newLineChar + "* Condition: %s" + newLineChar + "* Actions: %s",
        new def[] {
          watchId,
          execution.state,
          inputStatus,
          conditionStatus,
          'not implemented'
        }
      )
    );
  }

  watchMessages.put(watchId, messages);
}

return [
  'shouldSendMessage': shouldSendMessage,
  'watchMessages': watchMessages
];
