def watchIds = ctx.payload.env.watchIds;
def shouldSendMessage = false;
def watchMessages = new HashMap();
def newLineChar = (String)(char)0x0a; // reference: https://gist.github.com/vjt/06b28fbd988788c2a7a71c63dd9163be
def tabChar = (String)(char)0x09;

for (watchId in watchIds) {
  def messages = [];
  def executions = ctx.payload[watchId].hits.hits;

  if (executions.size() > 0) {
    shouldSendMessage = true;
  }

  for (e in executions) {
    def execution = e._source;
    def executionResult = execution.result;
    def inputStatus = executionResult.input != null ? executionResult.input.status : '(none)';
    def conditionStatus = executionResult.condition != null ? executionResult.condition.status : '(none)';

    def actionStatuses = [];
    if (executionResult.actions != null) {
      for (a in executionResult.actions) {
        actionStatuses.add(a.id + ':' + a.status);
      }
    }
    def actionsStatus = actionStatuses.size() > 0 ? String.join(', ', actionStatuses) : '(none)';

    messages.add(
      String.format(
         tabChar + "Execution state: %s" + newLineChar + tabChar + "Input: %s" + newLineChar + tabChar + "Condition: %s" + newLineChar + tabChar + "Actions: %s" + newLineChar,
        new def[] {
          execution.state,
          inputStatus,
          conditionStatus,
          actionsStatus
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
