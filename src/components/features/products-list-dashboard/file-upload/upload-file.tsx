"use client"
import React, { useState, useRef } from 'react';
import { Upload, Copy, Check, Folder, X, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadMediaAction } from '@/app/actions/image';

// Tipos
interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
}

interface UploadedFile {
  name: string;
  url: string;
  type: 'image' | 'video';
}

const MediaUploader = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [bucketName, setBucketName] = useState('eventos');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({});
    setErrorMessages([]);

    // Procesar archivos uno por uno con server actions
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as File;
      const fileId = `${file.name}-${i}`;

      try {
        // Marcar archivo como en progreso
        setUploadProgress(prev => ({ ...prev, [fileId]: true }));

        // Crear FormData para la server action
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucketName', bucketName);
        if (folderName.trim()) {
          formData.append('folderName', folderName.trim());
        }


        const result = await uploadMediaAction(formData);
        console.log("🚀 ~ handleFilesChange ~ result:", result)


        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });

        if (result && result.success && result.url) {
          const fileType = file.type.startsWith('image/') ? 'image' : 'video';
          const newFile: UploadedFile = {
            name: result.fileName || file.name,
            url: result.url,
            type: fileType as 'image' | 'video'
          };

          setUploadedFiles(prev => [...prev, newFile]);
        } else {
          setErrorMessages(prev => [...prev, `Error subiendo ${file.name}: ${result.error}`]);
        }
      } catch (error) {
        console.log("🚀 ~ handleFilesChange ~ error:", error)
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        setErrorMessages(prev => [...prev, `Error subiendo ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`]);
        console.error('Error uploading file:', file.name, error);
      }
    }

    setIsUploading(false);

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const copyAllUrls = async () => {
    const urls = uploadedFiles.map(file => file.url).join(', ');
    try {
      await navigator.clipboard.writeText(urls);
      setCopiedUrl('all');
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setErrorMessages([]);
  };

  const dismissError = (index: number) => {
    setErrorMessages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-[50vw] mx-auto p-6 bg-white ">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Subir Fotos y Videos </h2>

      {/* Configuración */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Folder className="inline w-4 h-4 mr-1" />
            Nombre de la carpeta (opcional)
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="mi-carpeta"
            disabled={isUploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bucket de Supabase
          </label>
          <input
            type="text"
            value={bucketName}
            disabled={true}
            onChange={(e) => setBucketName(e.target.value)}
            placeholder="eventos"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* Área de subida */}
      <div className=" border-gray-300 rounded-lg p-8 text-center mb-6 hover:border-blue-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFilesChange}
          disabled={isUploading}
          className="hidden"
        />

        <Button
          onClick={handleFileSelect}
          disabled={isUploading}
        >
          {isUploading ? 'Subiendo...' : 'Seleccionar Archivos'}
        </Button>
        <p className="text-sm text-gray-500 mt-2">
          Soporta imágenes y videos • Procesamiento secuencial en servidor
        </p>
      </div>

      {/* Estado de subida */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mb-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Procesando en servidor...</h3>
          <div className="space-y-2">
            {Object.keys(uploadProgress).map((fileId) => (
              <div key={fileId} className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-700">{fileId.split('-')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errores */}
      {errorMessages.length > 0 && (
        <div className="mb-6">
          {errorMessages.map((error, index) => (
            <div key={index} className="bg-red-50 border border-red-200 rounded-md p-3 mb-2 flex items-center justify-between">
              <span className="text-red-700 text-sm">{error}</span>
              <button
                onClick={() => dismissError(index)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lista de archivos subidos */}
      {uploadedFiles.length > 0 && (
        <div>
          <div className="flex justify-between items-center ">
            <h3 className="text-lg font-semibold">
              Archivos subidos ({uploadedFiles.length})
            </h3>
            <div className="space-x-2">
              <Button
                onClick={copyAllUrls}
              >
                Copiar todas las URLs
              </Button>
              <Button
                onClick={clearAll}
              >
                Limpiar todo
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {file.type === 'image' ? (
                    <Image className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  ) : (
                    <Video className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {file.url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => copyToClipboard(file.url)}
                    className="p-2 text-gray-500 hover:text-green-600 transition-colors"
                    title="Copiar URL"
                  >
                    {copiedUrl === file.url ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                    title="Eliminar de la lista"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;