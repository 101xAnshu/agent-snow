export function Home() {
  return (
    <box
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
    >
      <ascii-font text="AgentSnow" font="slick" />
      <text>
        <b>Terminal AI Coding Agent</b>
      </text>
      <text fg="gray" marginTop={1}>
        Type a message to start a new session
      </text>
      <text fg="gray">Tab to toggle mode · /agents · /models</text>
    </box>
  );
}
