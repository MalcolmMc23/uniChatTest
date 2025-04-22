import { useState, useEffect, useRef } from "react";
import AgoraRTC, {
  IAgoraRTCRemoteUser,
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ClientConfig,
} from "agora-rtc-sdk-ng";
import "./VideoCall.css";

// Agora app configuration
// Load env variables from Vite's environment
const appId = import.meta.env.VITE_APP_ID as string; // Your Agora App ID from .env
const token =
  import.meta.env.VITE_TOKEN === "null" ? null : import.meta.env.VITE_TOKEN; // Token or null

// ---- Debugging Line ----
console.log("Attempting to use Agora App ID:", appId);
// ----------------------
// ---- Debugging Line ----
console.log("Attempting to use Token:", token);
// ----------------------

// Client config
const config: ClientConfig = {
  mode: "rtc",
  codec: "vp8",
};

// TURN server configuration for Agora from env
const turnServerConfig = {
  turnServerURL: import.meta.env.VITE_TURN_SERVER_URL,
  username: import.meta.env.VITE_TURN_USERNAME,
  password: import.meta.env.VITE_TURN_PASSWORD,
  udpport: Number(import.meta.env.VITE_TURN_UDP_PORT),
  tcpport: Number(import.meta.env.VITE_TURN_TCP_PORT),
  forceturn: true,
};

// Participant component with university name
const ParticipantVideo = ({
  videoRef,
  name,
  userName,
}: {
  videoRef: React.RefObject<HTMLDivElement | null>;
  name: string;
  userName?: string;
}) => {
  return (
    <div className="participant-container">
      <div className="university-name">{name}</div>
      <div className="video-frame" ref={videoRef}></div>
      {userName && <div className="participant-name">{userName}</div>}
    </div>
  );
};

// Control button component
const ControlButton = ({
  color,
  onClick,
  children,
}: {
  color: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) => {
  return (
    <button
      className="control-button"
      style={{ backgroundColor: color }}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Join Room component
const JoinRoomForm = ({ onJoin }: { onJoin: (channel: string) => void }) => {
  const [channelName, setChannelName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (channelName.trim()) {
      onJoin(channelName);
    }
  };

  return (
    <div className="join-room-container">
      <h2>Join a Video Room</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          placeholder="Enter room code"
          required
        />
        <button type="submit">Join Room</button>
      </form>
    </div>
  );
};

// The main video room component
const VideoRoom = () => {
  const [inCall, setInCall] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [users, setUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<IMicrophoneAudioTrack | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const joinRoom = (channel: string) => {
    setChannelName(channel);
    setInCall(true);
  };

  // Effect for checking config and initializing Agora
  useEffect(() => {
    if (!inCall) return; // Don't initialize if not in a call

    if (!appId) {
      setConfigError(
        "Agora App ID is not configured. Please check your .env file."
      );
      return;
    }

    const client = AgoraRTC.createClient(config);
    clientRef.current = client;

    const init = async () => {
      try {
        if (import.meta.env.VITE_TURN_SERVER_URL) {
          await client.setTurnServer(turnServerConfig);
          console.log("TURN server configured.");
        } else {
          console.log(
            "TURN server URL not found, skipping TURN configuration."
          );
        }

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();

        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        client.on("user-published", handleUserPublished);
        client.on("user-unpublished", handleUserUnpublished);
        client.on("user-left", handleUserLeft);

        await client.join(appId, channelName, token, null);
        await client.publish([audioTrack, videoTrack]);

        console.log("Successfully joined channel and published tracks");
      } catch (error) {
        console.error("Error initializing Agora:", error);
        setConfigError(`Failed to initialize Agora: ${error}`);
      }
    };

    init();

    return () => {
      localAudioTrack?.close();
      localVideoTrack?.close();
      clientRef.current?.leave();
      clientRef.current?.removeAllListeners();
    };
  }, [channelName, inCall]); // Rerun if channelName or inCall changes

  // --- Agora Event Handlers ---
  const handleUserPublished = async (
    user: IAgoraRTCRemoteUser,
    mediaType: "audio" | "video"
  ) => {
    if (!clientRef.current) return;
    await clientRef.current.subscribe(user, mediaType);

    if (mediaType === "video") {
      setUsers((prevUsers) => {
        if (prevUsers.find((u) => u.uid === user.uid)) return prevUsers;
        return [...prevUsers, user];
      });
    }

    if (mediaType === "audio") {
      user.audioTrack?.play();
    }
  };

  const handleUserUnpublished = (
    user: IAgoraRTCRemoteUser,
    mediaType: "audio" | "video"
  ) => {
    if (mediaType === "video") {
      setUsers((prevUsers) => prevUsers.filter((u) => u.uid !== user.uid));
    }
  };

  const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
    setUsers((prevUsers) => prevUsers.filter((u) => u.uid !== user.uid));
  };
  // --- End Agora Event Handlers ---

  // --- Leave Call Functionality ---
  const leaveCall = async () => {
    localAudioTrack?.close();
    localVideoTrack?.close();
    await clientRef.current?.leave();
    setUsers([]);
    setInCall(false);
    console.log("Left the call");
  };
  // --- End Leave Call ---

  // --- Render Logic ---
  if (configError) {
    return (
      <div className="error-message">
        <h2>Configuration Error</h2>
        <p>{configError}</p>
      </div>
    );
  }

  if (!inCall) {
    return <JoinRoomForm onJoin={joinRoom} />;
  }

  return (
    <div className="video-room">
      <div className="video-grid">
        {/* Local video - always University of Oregon */}
        <ParticipantVideo
          videoRef={localVideoRef}
          name="University of Oregon"
          userName="Freddie F."
        />

        {/* Remote videos - map users, assign Texas Christian University to the first */}
        {users.length > 0 ? (
          users.map((user, index) => (
            <RemoteVideo
              key={user.uid}
              user={user}
              name={
                index === 0
                  ? "Texas Christian University"
                  : `Participant ${index + 1}` // Fallback name
              }
              userName={index === 0 ? "Basim I." : undefined} // Assign Basim to the first remote user
            />
          ))
        ) : (
          // Placeholder for the second participant if no remote users
          <div className="empty-participant">
            <div className="university-name">Texas Christian University</div>
            <div className="waiting-message">Waiting for participant...</div>
          </div>
        )}
      </div>

      <div className="channel-display">
        <p>
          Channel Code: <span className="channel-code">{channelName}</span>
        </p>
      </div>

      <div className="control-panel">
        <ControlButton color="#D4B851" />
        <ControlButton color="#E3584D" onClick={leaveCall} />
        <ControlButton color="#70B98B" />
      </div>
    </div>
  );
};

// Component to render a remote user's video
const RemoteVideo = ({
  user,
  name,
  userName,
}: {
  user: IAgoraRTCRemoteUser;
  name: string;
  userName?: string;
}) => {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && user.videoTrack) {
      user.videoTrack.play(videoRef.current);
      return () => {
        user.videoTrack?.stop();
      };
    }
  }, [user.videoTrack]); // Depend on videoTrack specifically

  return (
    <ParticipantVideo videoRef={videoRef} name={name} userName={userName} />
  );
};

export default VideoRoom; // Export VideoRoom as the default
