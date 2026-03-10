import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileType } from 'lucide-react';

export default function FileUploadZone({ file, setFile, disabled }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, [setFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      {file ? (
        <div className="flex flex-col items-center text-center">
          <FileType className="w-12 h-12 text-blue-500 mb-3" />
          <p className="text-sm font-semibold text-gray-700">{file.name}</p>
          <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          {!disabled && <p className="text-xs text-blue-600 mt-2 hover:underline">Click or drag to replace</p>}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <UploadCloud className={`w-12 h-12 mb-3 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-sm font-medium text-gray-700">
            {isDragActive ? "Drop the CSV file here..." : "Drag & drop your CSV file here"}
          </p>
          <p className="text-xs text-gray-500 mt-1">or click to browse files</p>
        </div>
      )}
    </div>
  );
}
