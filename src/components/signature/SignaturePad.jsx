import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Eraser, 
  Check, 
  RotateCcw,
  Pen,
  Download
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function SignaturePad({ 
  onSave, 
  onCancel,
  title = "חתימת לקוח",
  width = 400,
  height = 200,
  penColor = '#000000',
  backgroundColor = '#ffffff',
  callId = null
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Set drawing style
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height, penColor, backgroundColor]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
  };

  const saveSignature = async () => {
    if (!hasSignature) {
      toast.error('נא לחתום לפני השמירה');
      return;
    }

    setSaving(true);
    
    try {
      const canvas = canvasRef.current;
      
      // Convert canvas to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });

      // Create file from blob
      const file = new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' });

      // Upload using Base44
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // If callId provided, save to CallPhoto
      if (callId) {
        await base44.entities.CallPhoto.create({
          call_id: callId,
          file_url: file_url,
          file_name: 'חתימת לקוח',
          category: 'customer_signature',
          uploaded_by: 'customer'
        });
      }

      toast.success('החתימה נשמרה בהצלחה');
      
      if (onSave) {
        onSave(file_url);
      }

    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('שגיאה בשמירת החתימה');
    } finally {
      setSaving(false);
    }
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `signature_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Pen className="w-4 h-4 text-[#6B778C]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Signature Canvas */}
        <div className="border-2 border-dashed border-[#DFE1E6] rounded-lg p-2 bg-white">
          <canvas
            ref={canvasRef}
            className="w-full touch-none cursor-crosshair rounded"
            style={{ maxWidth: '100%', height: 'auto', aspectRatio: `${width}/${height}` }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        {/* Instructions */}
        <p className="text-xs text-[#6B778C] text-center">
          חתום באמצעות העכבר או האצבע על המסך
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            className="gap-1"
          >
            <Eraser className="w-4 h-4" />
            נקה
          </Button>
          
          {hasSignature && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadSignature}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              הורד
            </Button>
          )}
          
          <div className="flex-1" />
          
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              ביטול
            </Button>
          )}
          
          <Button
            type="button"
            size="sm"
            onClick={saveSignature}
            disabled={!hasSignature || saving}
            className="bg-[#FF0000] hover:bg-[#CC0000] gap-1"
          >
            {saving ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            שמור חתימה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}