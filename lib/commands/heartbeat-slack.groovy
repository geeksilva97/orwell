HashMap buildMarkdown(String text) {
  def mrkdown = new HashMap();

  mrkdown.put("type", "mrkdwn");
  mrkdown.put("text", text);

  return mrkdown;
}

HashMap buildSection(String sectionText) {
  def section = new HashMap();

  section.put("type", "section");
  section.put("text", buildMarkdown(sectionText));

  return section;
}

HashMap buildDivider() {
  def divider = new HashMap();

  divider.put("type", "divider");

  return divider;
}

HashMap buildText(String textValue) {
  def text = new HashMap();

  text.put("type", "plain_text");
  text.put("text", textValue);
  text.put("emoji", true);

  return text;
}

HashMap buildActionButton(String buttonValue, String url) {
  def button = new HashMap();

  button.put("type", "button");
  button.put("style", "primary");
  button.put("text", buildText(buttonValue));
  button.put("url", url);

  return button;
}

// -------

// For some dang reason adding a \n to the string causes the script to crash when uploading the watcher and if we do \\n it does not add the break line, it prints "\\n" in the slack message
// This hack allows us to bypass the painless compiler and escape the new line correctly
def newLineChar = (String)(char)0x0a; // reference: https://gist.github.com/vjt/06b28fbd988788c2a7a71c63dd9163be

def watchMessages = ctx.payload.watchMessages;
def messageBlocks = new ArrayList();

def headerBlock = new HashMap();
headerBlock.put("type", "header");
headerBlock.put("text", "Orwell Heartbeat Watcher");
messageBlocks.add(0, headerBlock);

for (watchId in watchMessages.keySet()) {
  def messages = watchMessages[watchId];
  String text = "Watcher: " + watchId + newLineChar;

  for (message in messages) {
    text += "* " + message + "*" + newLineChar;
  }

  messageBlocks.add(buildSection(text));
  messageBlocks.add(buildDivider());
}

return ['message': ['blocks': messageBlocks]];
