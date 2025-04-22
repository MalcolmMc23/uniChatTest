import "./App.css";
import VideoCall from "./components/VideoCall";

function App() {
  return (
    <div className="app-container">
      <header>
        <h1>Agora Video Chat</h1>
      </header>
      <main>
        <VideoCall />
      </main>
      <footer>
        <p>Powered by Agora RTC SDK</p>
      </footer>
    </div>
  );
}

export default App;
