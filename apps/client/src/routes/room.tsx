import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  CameraIcon,
  CameraOffIcon,
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
} from "lucide-react";

import AgoraRTM, {
  type RtmChannel,
  type RtmClient,
  type RtmMessage,
} from "agora-rtm-sdk";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { constraints, servers } from "@/lib/config";
import { useAuth } from "@/features/auth/contexts/auth.context";

const APP_ID = import.meta.env.AGORA_APP_ID;
const UID = String(Math.floor(Math.random() * 10000));
const TOKEN = undefined;

export const Room = () => {
  const { room } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', {
        state: { redirect: `/room/${room}` },
      });
    }
  }, [isAuthenticated, isLoading, navigate, room]);

  // Show loading or nothing while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }
  const client = useRef<RtmClient>(null);
  const channel = useRef<RtmChannel>(null);
  const localStream = useRef<MediaStream>(null);
  const currentUserVideo = useRef<HTMLVideoElement>(null);
  const opponentUserVideo = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const leaveChannel = useCallback(async () => {
    await channel.current?.leave();
    client.current?.logout();
    navigate("/");
  }, [navigate]);

  const toggleVideo = useCallback(async () => {
    const videoTrack = localStream.current
      ?.getTracks()
      .find((track) => track.kind === "video");

    if (!videoTrack) {
      return;
    }

    videoTrack.enabled = !videoTrack.enabled;
    setVideoEnabled(videoTrack.enabled);
  }, []);

  const toggleMic = useCallback(async () => {
    const audioTrack = localStream.current
      ?.getTracks()
      .find((track) => track.kind === "audio");

    if (!audioTrack) {
      return;
    }

    audioTrack.enabled = !audioTrack.enabled;
    setMicEnabled(audioTrack.enabled);
  }, []);

  useEffect(() => {
    let remoteStream: MediaStream;
    let peerConnection: RTCPeerConnection;

    const setupLocalStream = async () => {
      try {
        // show self device to video tag
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (currentUserVideo.current) {
          currentUserVideo.current.srcObject = stream;
        }

        setVideoEnabled(true);
        setMicEnabled(true);

        return stream;
      } catch (error) {
        console.error("[ERROR]: setupLocalStream", error);
        return null;
      }
    };

    const createPeerConnection = async (memberId: string) => {
      peerConnection = new RTCPeerConnection(servers);

      remoteStream = new MediaStream();
      if (opponentUserVideo.current) {
        opponentUserVideo.current.srcObject = remoteStream;
        opponentUserVideo.current.style.display = "block";
      }

      setIsConnected(true);
      // if (currentUserVideo.current) {
      //   currentUserVideo.current.classList.add("smallFrame");
      // }

      if (!localStream.current) {
        localStream.current = await setupLocalStream();
      }

      localStream.current?.getTracks().forEach((track) => {
        if (localStream.current) {
          peerConnection.addTrack(track, localStream.current);
        }
      });

      peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          client.current?.sendMessageToPeer(
            {
              text: JSON.stringify({
                type: "candidate",
                candidate: event.candidate,
              }),
            },
            memberId,
          );
        }
      };
    };

    const createOffer = async (memberId: string) => {
      await createPeerConnection(memberId);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      client.current?.sendMessageToPeer(
        {
          text: JSON.stringify({
            type: "offer",
            offer,
          }),
        },
        memberId,
      );
    };

    const handleMessageFromPeer = async (
      message: RtmMessage,
      memberId: string,
    ) => {
      if (!message.text) return;

      const data = JSON.parse(message.text);
      console.log("Message received", data, memberId);

      if (data.type === "offer") {
        await createPeerConnection(memberId);

        await peerConnection.setRemoteDescription(data.offer);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        client.current?.sendMessageToPeer(
          {
            text: JSON.stringify({
              type: "answer",
              answer,
            }),
          },
          memberId,
        );
      }

      if (data.type === "answer") {
        if (!peerConnection.currentRemoteDescription) {
          await peerConnection.setRemoteDescription(data.answer);
        }
      }

      if (data.type === "candidate") {
        peerConnection.addIceCandidate(data.candidate);
      }
    };

    const handleUserJoined = (memberId: string) => {
      console.log("New user joined", memberId);
      createOffer(memberId);
    };

    const handleUserLeft = (memberId: string) => {
      console.log("User left", memberId);

      if (opponentUserVideo.current) {
        opponentUserVideo.current.style.display = "none";
      }

      setIsConnected(false);
      // currentUserVideo.current?.classList.remove("smallFrame");
    };

    const init = async () => {
      if (!room) {
        navigate("/");
        return;
      }

      // WS connection with agora
      client.current = AgoraRTM.createInstance(APP_ID);
      await client.current.login({ uid: UID, token: TOKEN });

      channel.current = client.current.createChannel(room);
      await channel.current.join();

      // When user joined, we create peer connection with WebRTC
      channel.current.on("MemberJoined", handleUserJoined);
      // When user left, we just hide video
      channel.current.on("MemberLeft", handleUserLeft);

      client.current.on("MessageFromPeer", handleMessageFromPeer);

      localStream.current = await setupLocalStream();
    };

    init();

    return () => {
      leaveChannel();
    };
  }, [leaveChannel, navigate, room]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <div id="videos" className="h-dvh w-full overflow-hidden">
        <video
          ref={currentUserVideo}
          id="user-1"
          className={cn("bg-stone-900 size-full object-cover object-center", {
            "fixed bottom-4 right-4 size-1/4 rounded-sm shadow-accent z-[999] border border-accent":
              isConnected,
          })}
          autoPlay
          playsInline
        ></video>
        <video
          ref={opponentUserVideo}
          id="user-2"
          className="bg-stone-900 size-full object-cover object-center"
          autoPlay
          playsInline
        ></video>
      </div>

      <div className="fixed bottom-4 flex gap-2 left-1/2 -translate-x-1/2">
        <Button
          variant={videoEnabled ? "secondary" : "destructive"}
          size="icon"
          className="size-14"
          onClick={toggleVideo}
        >
          {videoEnabled ? (
            <CameraIcon className="size-6" />
          ) : (
            <CameraOffIcon className="size-6" />
          )}
        </Button>
        <Button
          variant={micEnabled ? "secondary" : "destructive"}
          size="icon"
          className="size-14"
          onClick={toggleMic}
        >
          {micEnabled ? (
            <MicIcon className="size-6" />
          ) : (
            <MicOffIcon className="size-6" />
          )}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="size-14"
          onClick={leaveChannel}
        >
          <PhoneOffIcon className="size-6" />
        </Button>
      </div>
    </div>
  );
};
