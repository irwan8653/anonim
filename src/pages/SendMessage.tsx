import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, MicOff, Send, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

const SendMessage = () => {
  const { username } = useParams<{ username: string }>();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    if (!username) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive"
      });
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Choose the best supported mimeType for broad playback support
      const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported)
        ? (candidates.find(t => MediaRecorder.isTypeSupported(t)) || '')
        : '';

      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType }) 
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const detectedType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: detectedType });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Start speaking your message"
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Recording stopped",
        description: "Your audio message is ready"
      });
    }
  };

  const handleAudioFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      toast({ title: 'File terlalu besar', description: 'Maksimum 10MB', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setIsRecording(false);
  };

  const sendTextMessage = async () => {
    if (!profile || !messageText.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          recipient_id: profile.id,
          message_text: messageText.trim(),
          message_type: 'text'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Your anonymous message has been sent!"
      });
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
    setSending(false);
  };

  const sendAudioMessage = async () => {
    if (!profile || !audioBlob) return;

    setSending(true);
    try {
      // Upload audio file
      // Tentukan ekstensi berdasarkan MIME type
      const mime = audioBlob.type || 'audio/webm';
      const extMap: Record<string, string> = {
        'audio/webm': 'webm',
        'audio/webm;codecs=opus': 'webm',
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/mp4': 'm4a',
        'audio/aac': 'm4a',
        'audio/wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/ogg;codecs=opus': 'ogg',
      };
      const ext = extMap[mime] || 'webm';
      const fileName = `${Date.now()}-${profile.id}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-messages')
        .upload(fileName, audioBlob, { contentType: mime });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-messages')
        .getPublicUrl(fileName);

      // Save message to database
      const { error } = await supabase
        .from('messages')
        .insert({
          recipient_id: profile.id,
          audio_url: `audio-messages/${fileName}`,
          message_type: 'audio'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Your anonymous audio message has been sent!"
      });
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (error) {
      console.error('Error sending audio message:', error);
      toast({
        title: "Error",
        description: "Failed to send audio message",
        variant: "destructive"
      });
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>User Not Found</CardTitle>
            <CardDescription>
              The username "{username}" does not exist.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-vibrant p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Send Anonymous Message</h1>
          <p className="text-muted-foreground mt-2">
            Send an anonymous message to <span className="font-medium">{profile.display_name}</span>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose Your Message Type</CardTitle>
            <CardDescription>
              Send a text message or record an audio message anonymously
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Text Message</TabsTrigger>
                <TabsTrigger value="audio">Audio Message</TabsTrigger>
              </TabsList>
              
              <TabsContent value="text" className="space-y-4">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Type your anonymous message here..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={6}
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {messageText.length}/1000 characters
                    </p>
                    <Button 
                      onClick={sendTextMessage} 
                      disabled={!messageText.trim() || sending}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="audio" className="space-y-4">
                <div className="space-y-4">
                  <div className="text-center">
                    {!isRecording && !audioBlob ? (
                      <div className="space-y-3">
                        <Button 
                          onClick={startRecording}
                          size="lg"
                          className="w-full"
                        >
                          <Mic className="w-5 h-5 mr-2" />
                          Mulai Rekam
                        </Button>
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={handleAudioFileSelected}
                          />
                          <Button 
                            variant="outline"
                            size="lg"
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Unggah Audio dari Perangkat
                          </Button>
                        </div>
                      </div>
                    ) : isRecording ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center">
                          <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mr-2"></div>
                          <span className="text-sm">Recording...</span>
                        </div>
                        <Button 
                          onClick={stopRecording}
                          variant="destructive"
                          size="lg"
                          className="w-full"
                        >
                          <Square className="w-5 h-5 mr-2" />
                          Stop Recording
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-accent/50">
                          <p className="text-sm text-muted-foreground mb-2">Preview your recording:</p>
                          {audioUrl && (
                            <audio controls className="w-full" src={audioUrl}>
                              Your browser does not support the audio element.
                            </audio>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => {
                              setAudioBlob(null);
                              setAudioUrl(null);
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            <MicOff className="w-4 h-4 mr-2" />
                            Record Again
                          </Button>
                          <Button 
                            onClick={sendAudioMessage}
                            disabled={sending}
                            className="flex-1"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {sending ? 'Sending...' : 'Send Audio'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Your message will be sent completely anonymously.</p>
          <p>The recipient will not know who sent it.</p>
        </div>
      </div>
    </div>
  );
};

export default SendMessage;