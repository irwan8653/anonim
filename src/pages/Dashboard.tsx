import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Eye, EyeOff, Share2, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  message_text: string | null;
  audio_url: string | null;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchMessages();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
  };

  const fetchMessages = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } else {
      setMessages(data || []);
    }
    setLoadingMessages(false);
  };

  const markAsRead = async (messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (!error) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
    }
  };

  const copyShareLink = () => {
    if (!profile) return;
    
    const shareLink = `${window.location.origin}/send/${profile.username}`;
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Success",
      description: "Share link copied to clipboard!"
    });
  };

  const downloadVideoTemplate = async (message: Message) => {
    if (!message.audio_url) return;
    
    toast({
      title: "Creating video...",
      description: "Please wait while we create your MP4 video with template"
    });
    
    try {
      const filePath = message.audio_url.replace(/^audio-messages\//, '');
      const { data } = supabase.storage
        .from('audio-messages')
        .getPublicUrl(filePath);
      
      // Create audio context and audio element
      const audioContext = new AudioContext();
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = data.publicUrl;
      
      // Wait for audio to be ready and get duration
      await new Promise((resolve, reject) => {
        audio.oncanplaythrough = resolve;
        audio.onerror = reject;
        audio.load();
      });
      
      const duration = audio.duration;
      console.log('Audio duration:', duration);
      
      // Create canvas for video frames
      const canvas = document.createElement('canvas');
      const width = 1080;
      const height = 1080;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');
      
      // Check MediaRecorder support
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        throw new Error('WebM format not supported');
      }
      
      const stream = canvas.captureStream(30);
      
      // Connect audio to destination for recording
      const audioSource = audioContext.createMediaElementSource(audio);
      const dest = audioContext.createMediaStreamDestination();
      audioSource.connect(dest);
      
      // Combine video and audio streams
      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);
      
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm'
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audio-message-video-${format(new Date(message.created_at), 'yyyy-MM-dd-HHmm')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Success!",
          description: "MP4 video template downloaded successfully!"
        });
      };
      
      // Start recording
      recorder.start();
      
      let startTime = Date.now();
      let animationId: number;
      
      const drawFrame = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Cute kawaii background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, 'hsl(340, 82%, 90%)');
        bgGrad.addColorStop(0.3, 'hsl(260, 75%, 92%)');
        bgGrad.addColorStop(0.7, 'hsl(200, 90%, 88%)');
        bgGrad.addColorStop(1, 'hsl(150, 65%, 85%)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
        
        // Animated polka dots
        ctx.fillStyle = `hsl(340, 82%, ${85 + Math.sin(elapsed * 2) * 10}%)`;
        for (let i = 0; i < 30; i++) {
          const x = (width / 6) * (i % 6) + 90;
          const y = (height / 5) * Math.floor(i / 6) + 90;
          const radius = 12 + Math.sin(elapsed * 3 + i * 0.5) * 6;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fill();
        }
        
        // Card container
        const pad = 72;
        const cardX = pad;
        const cardY = pad + 100;
        const cardW = width - pad * 2;
        const cardH = height - pad * 2 - 200;
        
        const radius = 32;
        const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        };
        
        // Card shadow and background
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        roundRect(cardX, cardY, cardW, cardH, radius);
        ctx.fillStyle = 'hsl(0, 0%, 100%)';
        ctx.fill();
        ctx.restore();
        
        // Title
        ctx.fillStyle = 'hsl(222, 84%, 5%)';
        ctx.font = 'bold 48px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const title = 'Anonymous Audio Message';
        ctx.fillText(title, cardX + 48, cardY + 48);
        
        // Badge
        const badgeText = 'AUDIO';
        ctx.font = 'bold 24px Arial, sans-serif';
        const badgeW = ctx.measureText(badgeText).width + 32;
        const badgeH = 36;
        const badgeX = cardX + 48;
        const badgeY = cardY + 110;
        ctx.fillStyle = 'hsl(340, 82%, 70%)';
        roundRect(badgeX, badgeY, badgeW, badgeH, 8);
        ctx.fill();
        ctx.fillStyle = 'hsl(0, 0%, 100%)';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + 16, badgeY + badgeH / 2);
        
        // Message text
        ctx.fillStyle = 'hsl(222, 84%, 5%)';
        ctx.font = '28px Arial, sans-serif';
        ctx.textBaseline = 'top';
        const messageText = message.message_text || 'Audio message received';
        const textY = badgeY + badgeH + 24;
        
        // Simple text wrapping
        const maxWidth = cardW - 96;
        const words = messageText.split(' ');
        let line = '';
        let y = textY;
        
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, cardX + 48, y);
            line = words[n] + ' ';
            y += 35;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, cardX + 48, y);
        
        // Animated waveform
        const waveY = y + 80;
        const bars = 40;
        const barW = (cardW - 96) / bars;
        const maxBarH = 80;
        
        for (let i = 0; i < bars; i++) {
          const frequency = 0.1 + (i / bars) * 0.3;
          const amplitude = Math.sin(elapsed * 4 + i * frequency) * 0.5 + 0.5;
          const barH = 20 + amplitude * maxBarH;
          const x = cardX + 48 + i * barW;
          const yBar = waveY + (maxBarH - barH) / 2;
          
          // Progress-based coloring
          const isActive = progress >= (i / bars);
          const hue = isActive ? 340 + (i / bars) * 60 : 220;
          const saturation = isActive ? 82 : 20;
          const lightness = isActive ? 70 : 80;
          
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          roundRect(x, yBar, barW - 2, barH, 3);
          ctx.fill();
        }
        
        // Progress bar
        const progressY = waveY + maxBarH + 40;
        const progressW = cardW - 96;
        const progressH = 8;
        
        // Progress background
        ctx.fillStyle = 'hsl(220, 20%, 90%)';
        roundRect(cardX + 48, progressY, progressW, progressH, 4);
        ctx.fill();
        
        // Progress fill
        ctx.fillStyle = 'hsl(340, 82%, 70%)';
        roundRect(cardX + 48, progressY, progressW * progress, progressH, 4);
        ctx.fill();
        
        // Time display
        ctx.fillStyle = 'hsl(222, 84%, 5%)';
        ctx.font = '20px Arial, sans-serif';
        const currentTime = Math.floor(elapsed);
        const totalTime = Math.floor(duration);
        const timeText = `${currentTime}s / ${totalTime}s`;
        ctx.fillText(timeText, cardX + 48, progressY + 30);
        
        // Continue animation or stop
        if (elapsed < duration + 1) { // Add 1 second buffer
          requestAnimationFrame(drawFrame);
        } else {
          console.log('Stopping recording...');
          recorder.stop();
          audio.pause();
          audio.currentTime = 0;
        }
      };
      
      // Add audio end event listener
      audio.onended = () => {
        console.log('Audio ended, stopping recording...');
        setTimeout(() => {
          recorder.stop();
        }, 500); // Small delay to ensure last frames are captured
      };
      
      // Start audio playback and animation
      audio.play().then(() => {
        console.log('Audio started playing');
        drawFrame();
      }).catch(error => {
        console.error('Audio play error:', error);
        // Start animation anyway
        drawFrame();
      });
      
    } catch (error) {
      console.error('Video creation error:', error);
      toast({
        title: "Error",
        description: `Failed to create video template: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const downloadAudioFile = async (message: Message) => {
    if (!message.audio_url) return;
    
    try {
      const filePath = message.audio_url.replace(/^audio-messages\//, '');
      const { data } = supabase.storage
        .from('audio-messages')
        .getPublicUrl(filePath);
      
      const response = await fetch(data.publicUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio-message-${format(new Date(message.created_at), 'yyyy-MM-dd-HHmm')}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Audio file downloaded successfully!"
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download audio file",
        variant: "destructive"
      });
    }
  };

  const downloadMessage = (message: Message) => {
    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue('--primary').trim() || '220 90% 50%';
    const accent = styles.getPropertyValue('--accent').trim() || '300 80% 60%';
    const foreground = styles.getPropertyValue('--foreground').trim() || '222 84% 5%';
    const card = styles.getPropertyValue('--card').trim() || '0 0% 100%';

    // Cute kawaii background with dots
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, 'hsl(340, 82%, 90%)');
    bgGrad.addColorStop(0.3, 'hsl(260, 75%, 92%)');
    bgGrad.addColorStop(0.7, 'hsl(200, 90%, 88%)');
    bgGrad.addColorStop(1, 'hsl(150, 65%, 85%)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    // Add cute polka dots
    ctx.fillStyle = 'hsl(340, 82%, 95%)';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = 8 + Math.random() * 12;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Card container
    const pad = 72;
    const cardX = pad;
    const cardY = pad;
    const cardW = width - pad * 2;
    const cardH = height - pad * 2;

    const radius = 32;
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = `hsl(${card})`;
    ctx.fill();
    ctx.restore();

    // Header
    ctx.fillStyle = `hsl(${foreground})`;
    ctx.font = '700 64px "Playfair Display", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const title = message.message_type === 'audio' ? 'Anonymous Audio Message' : 'Anonymous Message';
    ctx.fillText(title, cardX + 48, cardY + 48);

    // Badge
    const badgeText = message.message_type.toUpperCase();
    ctx.font = '600 28px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial';
    const badgeW = ctx.measureText(badgeText).width + 40;
    const badgeH = 44;
    const badgeX = cardX + 48;
    const badgeY = cardY + 130;
    ctx.fillStyle = `hsl(${primary})`;
    roundRect(badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();
    ctx.fillStyle = `hsl(${styles.getPropertyValue('--primary-foreground').trim() || '210 40% 98%'})`;
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + 20, badgeY + badgeH / 2);

    // Content text
    ctx.textAlign = 'left';
    ctx.fillStyle = `hsl(${foreground})`;
    ctx.font = '400 36px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial';

    const contentText = message.message_text && message.message_text.trim().length > 0
      ? message.message_text
      : 'Pesan audio diterima. Putar di Dashboard kamu.';

    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const words = text.split(' ');
      let line = '';
      let drawY = y;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, x, drawY);
          line = words[n] + ' ';
          drawY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, drawY);
      return drawY + lineHeight;
    };

    const textStartX = cardX + 48;
    const textStartY = badgeY + badgeH + 32;
    const textWidth = cardW - 96;
    const endY = wrapText(contentText, textStartX, textStartY, textWidth, 48);

    // Decorative audio waveform bars
    if (message.message_type === 'audio') {
      const bars = 48;
      const baseY = endY + 32;
      const barW = (textWidth - (bars - 1) * 6) / bars;
      for (let i = 0; i < bars; i++) {
        const h = 20 + Math.sin(i * 0.5) * 18 + Math.random() * 16;
        const x = textStartX + i * (barW + 6);
        const y = baseY + (64 - h) / 2;
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, 'hsl(340, 82%, 75%)');
        g.addColorStop(0.5, 'hsl(260, 75%, 80%)');
        g.addColorStop(1, 'hsl(200, 90%, 75%)');
        ctx.fillStyle = g;
        roundRect(x, y, barW, h, 2);
        ctx.fill();
      }
      
      // Add cute audio icon
      ctx.fillStyle = 'hsl(340, 82%, 70%)';
      ctx.font = '700 32px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText('🎵', textStartX + textWidth - 60, baseY + 20);
    }

    // Footer
    ctx.fillStyle = `hsl(${styles.getPropertyValue('--muted-foreground').trim() || '215 16% 47%'})`;
    ctx.font = '400 24px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial';
    const footer = `Diterima: ${format(new Date(message.created_at), 'PPp')}`;
    ctx.fillText(footer, cardX + 48, cardY + cardH - 72);

    // Export JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `message-${format(new Date(message.created_at), 'yyyy-MM-dd')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-vibrant p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.display_name || 'User'}!
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Share Link Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Your Anonymous Message Link
            </CardTitle>
            <CardDescription>
              Share this link to receive anonymous messages and audio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                {profile ? `${window.location.origin}/send/${profile.username}` : 'Loading...'}
              </div>
              <Button onClick={copyShareLink} variant="outline" size="icon">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Your Messages ({messages.length})</CardTitle>
            <CardDescription>
              All anonymous messages sent to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMessages ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No messages yet!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Share your link to start receiving anonymous messages
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 border rounded-lg ${
                      !message.is_read ? 'bg-accent/50 border-primary/20' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={message.message_type === 'audio' ? 'secondary' : 'default'}>
                            {message.message_type === 'audio' ? 'Audio' : 'Text'}
                          </Badge>
                          {!message.is_read && (
                            <Badge variant="destructive">New</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'PPp')}
                          </span>
                        </div>
                        
                        {message.message_text && (
                          <p className="text-sm mb-2">{message.message_text}</p>
                        )}
                        
                        {message.audio_url && (
                          <div className="mb-2">
                            {(() => {
                              const filePath = message.audio_url.replace(/^audio-messages\//, '');
                              const { data } = supabase.storage
                                .from('audio-messages')
                                .getPublicUrl(filePath);
                              const url = data.publicUrl;
                              console.log('Audio URL:', url); // Debug log
                              return (
                                <div className="space-y-2">
                                  <audio 
                                    controls 
                                    className="w-full max-w-sm" 
                                    preload="metadata"
                                    onError={(e) => {
                                      console.error('Audio error:', e);
                                      console.error('Audio src:', url);
                                    }}
                                    onLoadStart={() => console.log('Audio loading started')}
                                    onCanPlay={() => console.log('Audio can play')}
                                  >
                                    <source src={url} type="audio/webm" />
                                    <source src={url} type="audio/mp4" />
                                    <source src={url} type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                  </audio>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadVideoTemplate(message)}
                                      className="text-xs"
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      MP4 Video
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadAudioFile(message)}
                                      className="text-xs"
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      MP3 Audio
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!message.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(message.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadMessage(message)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;