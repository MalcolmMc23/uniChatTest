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

const VideoCall = () => {
  const [inCall, setInCall] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    // Check if appId is configured
    if (!appId) {
      setConfigError(
        "Agora App ID is not configured. Please set it in the VideoCall.tsx file."
      );
    }
  }, []);

  if (configError) {
    return (
      <div className="error-message">
        <h2>Configuration Error</h2>
        <p>{configError}</p>
      </div>
    );
  }

  return (
    <div className="video-call-container">
      {inCall ? (
        <VideoRoom setInCall={setInCall} channelName={channelName} />
      ) : (
        <ChannelForm setInCall={setInCall} setChannelName={setChannelName} />
      )}
    </div>
  );
};

// Form for entering channel name and joining
const ChannelForm = ({
  setInCall,
  setChannelName,
}: {
  setInCall: React.Dispatch<React.SetStateAction<boolean>>;
  setChannelName: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input !== "") {
      setChannelName(input);
      setInCall(true);
    }
  };

  return (
    <form className="join-form" onSubmit={handleSubmit}>
      <h2>Join a Video Call</h2>
      <input
        type="text"
        placeholder="Enter Channel Name"
        onChange={(e) => setInput(e.target.value)}
        value={input}
      />
      <button type="submit">Join</button>
    </form>
  );
};

// The main video room component
const VideoRoom = ({
  setInCall,
  channelName,
}: {
  setInCall: React.Dispatch<React.SetStateAction<boolean>>;
  channelName: string;
}) => {
  const [users, setUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<IMicrophoneAudioTrack | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create and initialize the Agora client
    const client = AgoraRTC.createClient(config);
    clientRef.current = client;

    // Function to initialize local tracks and join channel
    const init = async () => {
      try {
        // Set ICE servers for NAT traversal (TURN support)
        // Only set TURN server if the URL is provided
        if (import.meta.env.VITE_TURN_SERVER_URL) {
          await client.setTurnServer(turnServerConfig);
          console.log("TURN server configured.");
        } else {
          console.log(
            "TURN server URL not found in environment variables, skipping TURN configuration."
          );
        }

        // Create local audio and video tracks
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();

        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        // Play local video track
        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        // Setup event handlers
        client.on("user-published", handleUserPublished);
        client.on("user-unpublished", handleUserUnpublished);
        client.on("user-left", handleUserLeft);

        // Join the channel
        await client.join(appId, channelName, token, null);

        // Publish local tracks
        await client.publish([audioTrack, videoTrack]);

        console.log("Successfully joined channel and published local tracks");
      } catch (error) {
        console.error("Error initializing tracks or joining channel:", error);
      }
    };

    init();

    // Cleanup function
    return () => {
      if (localAudioTrack) {
        localAudioTrack.close();
      }
      if (localVideoTrack) {
        localVideoTrack.close();
      }
      if (clientRef.current) {
        clientRef.current.leave();
        clientRef.current.removeAllListeners();
      }
    };
  }, [channelName]);

  // Handler for when a remote user publishes a track
  const handleUserPublished = async (
    user: IAgoraRTCRemoteUser,
    mediaType: "audio" | "video"
  ) => {
    if (!clientRef.current) return;

    // Subscribe to the remote user
    await clientRef.current.subscribe(user, mediaType);

    // If it's video, update the users list
    if (mediaType === "video") {
      setUsers((prevUsers) => {
        // Check if user already exists
        if (prevUsers.find((u) => u.uid === user.uid)) {
          return prevUsers;
        }
        return [...prevUsers, user];
      });
    }

    // Play the audio if it's audio track
    if (mediaType === "audio" && user.audioTrack) {
      user.audioTrack.play();
    }
  };

  // Handler for when a remote user unpublishes a track
  const handleUserUnpublished = (
    user: IAgoraRTCRemoteUser,
    mediaType: "audio" | "video"
  ) => {
    if (mediaType === "video") {
      setUsers((prevUsers) => {
        return prevUsers.filter((User) => User.uid !== user.uid);
      });
    }
  };

  // Handler for when a remote user leaves
  const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
    setUsers((prevUsers) => {
      return prevUsers.filter((User) => User.uid !== user.uid);
    });
  };

  // Handle leave call
  const leaveCall = async () => {
    if (localAudioTrack) {
      localAudioTrack.close();
    }
    if (localVideoTrack) {
      localVideoTrack.close();
    }
    if (clientRef.current) {
      await clientRef.current.leave();
    }
    setInCall(false);
  };

  return (
    <div className="video-room">
      <div className="controls">
        <h3>Channel: {channelName}</h3>
        <p>Participants: {users.length + 1}</p>
        <button onClick={leaveCall}>Leave Call</button>
      </div>

      <div className="video-container">
        {/* Local video */}
        <div className="local-video" ref={localVideoRef}></div>

        {/* Remote videos */}
        {users.map((user) => (
          <RemoteVideo key={user.uid} user={user} />
        ))}
      </div>
    </div>
  );
};

// Component to render a remote user's video
const RemoteVideo = ({ user }: { user: IAgoraRTCRemoteUser }) => {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && user.videoTrack) {
      user.videoTrack.play(videoRef.current);

      return () => {
        user.videoTrack?.stop();
      };
    }
  }, [user]);

  return <div className="remote-video" ref={videoRef}></div>;
};

export default VideoCall;
