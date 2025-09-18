import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileImage, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { processImageToSetlist } from "@/ocr/ocr";
import { toast } from "@/hooks/use-toast";

interface OcrDropzoneProps {
  onComplete: (lines: string[]) => void;
  disabled?: boolean;
}

export const OcrDropzone = ({ onComplete, disabled }: OcrDropzoneProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const lines = await processImageToSetlist(file, (progress) => {
        setProgress(progress * 100);
      });

      if (lines.length === 0) {
        toast({
          title: "No text found",
          description: "Could not extract any text from this image. Try a clearer image.",
          variant: "destructive",
        });
        return;
      }

      onComplete(lines);
    } catch (error) {
      console.error("OCR failed:", error);
      toast({
        title: "Processing failed",
        description: "Failed to process the image. Please try again or use a different image.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploadedFile(file);
      processFile(file);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"],
    },
    multiple: false,
    disabled: disabled || isProcessing,
  });

  if (isProcessing) {
    return (
      <div className="border-2 border-dashed border-accent/30 rounded-xl p-8 text-center space-y-4 bg-accent/5">
        <div className="flex items-center justify-center">
          <div className="bg-accent/10 p-4 rounded-full">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Processing Image...</h3>
          <p className="text-sm text-muted-foreground">
            Extracting text from your setlist image
          </p>
          <Progress value={progress} className="w-full max-w-xs mx-auto" />
          <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
        isDragActive
          ? "border-accent bg-accent/10 scale-105"
          : "border-muted-foreground/30 hover:border-accent hover:bg-accent/5"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input {...getInputProps()} />
      
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className={`p-4 rounded-full ${isDragActive ? "bg-accent/20" : "bg-muted/20"}`}>
            {uploadedFile ? (
              <CheckCircle className="w-8 h-8 text-accent" />
            ) : isDragActive ? (
              <Upload className="w-8 h-8 text-accent animate-bounce" />
            ) : (
              <FileImage className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          {uploadedFile ? (
            <div className="space-y-2">
              <h3 className="font-semibold text-accent">Image Uploaded</h3>
              <p className="text-sm text-muted-foreground">{uploadedFile.name}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadedFile(null);
                }}
              >
                Upload Different Image
              </Button>
            </div>
          ) : isDragActive ? (
            <div>
              <h3 className="font-semibold text-accent">Drop your image here</h3>
              <p className="text-sm text-muted-foreground">
                Release to start processing
              </p>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold">Drag & drop your setlist image</h3>
              <p className="text-sm text-muted-foreground">
                Or click to select a file
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports PNG, JPG, WEBP, and other image formats
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};