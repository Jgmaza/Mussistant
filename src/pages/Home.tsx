import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Music, Upload, FileText, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { OcrDropzone } from "@/components/OcrDropzone";
import { parseSetlistLines } from "@/utils/parse";
import { useSetlistStore } from "@/store/setlistStore";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";

const Home = () => {
  const navigate = useNavigate();
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { setParsedSongs } = useSetlistStore();
  const { isAuthenticated } = useAuth();

  const handleTextSubmit = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to continue with playlist creation.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!textInput.trim()) {
      toast({
        title: "No setlist provided",
        description: "Please paste your setlist or upload an image.",
        variant: "destructive",
      });
      return;
    }

    const lines = textInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      toast({
        title: "Invalid setlist",
        description: "Please provide a valid setlist with song titles.",
        variant: "destructive",
      });
      return;
    }

    const parsed = parseSetlistLines(lines);
    setParsedSongs(parsed);
    
    toast({
      title: "Setlist parsed successfully",
      description: `Found ${parsed.length} songs. Ready to match with Spotify!`,
    });

    navigate("/review");
  };

  const handleOcrComplete = (lines: string[]) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to continue with playlist creation.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (lines.length === 0) {
      toast({
        title: "No songs found",
        description: "Could not extract any song titles from the image. Try uploading a clearer image.",
        variant: "destructive",
      });
      return;
    }

    const parsed = parseSetlistLines(lines);
    setParsedSongs(parsed);
    
    toast({
      title: "Image processed successfully",
      description: `Extracted ${parsed.length} songs from your image!`,
    });

    navigate("/review");
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Hero Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="flex items-center justify-center mb-6">
              <div className="hero-gradient p-4 rounded-2xl shadow-lg glow-effect">
                <Music className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
              Musisstant
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Your AI music assistant. Transform setlists into Spotify playlists in minutes. 
              Upload text or images, match songs automatically, and create playlists instantly.
            </p>
            {!isAuthenticated && (
              <div className="mt-8">
                <Link to="/auth">
                  <Button variant="hero" size="lg">
                    <User className="w-5 h-5 mr-2" />
                    Get Started - Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Input Methods */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Text Input */}
            <Card className="card-gradient shadow-lg hover:shadow-xl smooth-transition">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-primary/10 p-3 rounded-xl">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold">Paste Your Setlist</h2>
                <p className="text-muted-foreground">
                  Copy and paste your setlist text directly
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="setlist-text">Setlist</Label>
                  <Textarea
                    id="setlist-text"
                    placeholder="Paste your setlist here...&#10;&#10;Song Title - Artist&#10;Another Song&#10;Third Song - Different Artist"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-h-[200px] resize-y"
                  />
                </div>
                <Button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim() || isProcessing}
                  variant="hero"
                  size="lg"
                  className="w-full"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Extract Songs
                </Button>
              </CardContent>
            </Card>

            {/* OCR Upload */}
            <Card className="card-gradient shadow-lg hover:shadow-xl smooth-transition">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-accent/10 p-3 rounded-xl">
                    <Upload className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold">Upload Image</h2>
                <p className="text-muted-foreground">
                  Upload a photo of your printed or handwritten setlist
                </p>
              </CardHeader>
              <CardContent>
                <OcrDropzone
                  onComplete={handleOcrComplete}
                  disabled={isProcessing}
                />
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="text-center animate-slide-up">
            <h3 className="text-2xl font-semibold mb-6">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="bg-primary/10 p-4 rounded-xl w-fit mx-auto">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-semibold">1. Input Your Setlist</h4>
                <p className="text-muted-foreground text-sm">
                  Paste text or upload an image of your setlist
                </p>
              </div>
              <div className="space-y-3">
                <div className="bg-accent/10 p-4 rounded-xl w-fit mx-auto">
                  <Sparkles className="w-8 h-8 text-accent" />
                </div>
                <h4 className="font-semibold">2. Match Songs</h4>
                <p className="text-muted-foreground text-sm">
                  AI matches your songs with Spotify's catalog
                </p>
              </div>
              <div className="space-y-3">
                <div className="bg-primary/10 p-4 rounded-xl w-fit mx-auto">
                  <Music className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-semibold">3. Create Playlist</h4>
                <p className="text-muted-foreground text-sm">
                  Instantly create and share your Spotify playlist
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;