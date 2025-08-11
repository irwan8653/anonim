import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Mic, Shield, Share2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

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

  // Redirect authenticated users to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-vibrant">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Receive Anonymous Messages
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get honest feedback, messages, and audio recordings from people anonymously. 
            Just like NGL.link but with audio support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="/auth">Get Started</a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#features">Learn More</a>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <MessageCircle className="w-8 h-8 mb-2 text-primary" />
              <CardTitle>Text Messages</CardTitle>
              <CardDescription>
                Receive anonymous text messages from anyone with your link
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Mic className="w-8 h-8 mb-2 text-primary" />
              <CardTitle>Voice Messages</CardTitle>
              <CardDescription>
                Get voice recordings for more personal anonymous feedback
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-8 h-8 mb-2 text-primary" />
              <CardTitle>Completely Anonymous</CardTitle>
              <CardDescription>
                Senders remain completely anonymous - no tracking or identification
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How It Works */}
        <div className="text-center space-y-8">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Create Account</h3>
              <p className="text-muted-foreground">
                Sign up and get your personalized anonymous message link
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Share Your Link</h3>
              <p className="text-muted-foreground">
                Share your link on social media or with friends
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold">Receive Messages</h3>
              <p className="text-muted-foreground">
                View all your anonymous messages in your dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
