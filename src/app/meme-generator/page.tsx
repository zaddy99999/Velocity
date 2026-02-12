'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

interface MemeTemplate {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string;
}

export default function MemeGenerator() {
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MemeTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reference image (the character to swap in) - default to Zaddy
  const [characterImage, setCharacterImage] = useState<string | null>('/ZaddyPFP.png');
  const [twitterHandle, setTwitterHandle] = useState('');

  // AI generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const twitterAvatar = (handle: string) => `https://unavatar.io/twitter/${handle}`;

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch('/api/meme-templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTemplates();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setCharacterImage(event.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getTwitterAvatar = () => {
    if (!twitterHandle.trim()) return;
    setCharacterImage(twitterAvatar(twitterHandle.trim().replace('@', '')));
    setTwitterHandle('');
  };

  // Convert local image path to base64 for API
  const getImageAsBase64 = async (url: string): Promise<string> => {
    // If already a data URL, return as-is
    if (url.startsWith('data:')) return url;

    // If it's a local path, fetch and convert
    if (url.startsWith('/')) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }

    // External URL - return as-is (OpenAI can fetch it)
    return url;
  };

  const generateMeme = async () => {
    if (!selectedTemplate || !characterImage || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Get both images ready for API
      const templateUrl = await getImageAsBase64(selectedTemplate.imageUrl);
      const characterUrl = characterImage; // Already base64 or external URL

      const response = await fetch('/api/generate-meme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateUrl,
          characterUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setGeneratedImage(data.imageUrl);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate meme');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Copied!');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy');
    }
  };

  const downloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `meme-${Date.now()}.png`;
    link.click();
  };

  return (
    <main className="container meme-generator-page">
      <NavBar />

      <div className="meme-generator-header">
        <h1 className="meme-title">Meme Generator</h1>
        <p className="meme-subtitle">Upload your character, select a template, generate</p>
      </div>

      {/* Character input */}
      <div className="meme-input-compact">
        {characterImage && (
          <div className="user-image-preview-small">
            <img src={characterImage} alt="Character" />
            <button className="remove-btn" onClick={() => setCharacterImage(null)}>×</button>
          </div>
        )}
        <input
          type="text"
          placeholder="@twitter"
          value={twitterHandle}
          onChange={(e) => setTwitterHandle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && getTwitterAvatar()}
          className="meme-input-small"
        />
        <button className="meme-btn-small" onClick={getTwitterAvatar}>Get</button>
        <label className="meme-btn-small upload">
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          Upload
        </label>

        <button
          className="generate-btn"
          onClick={generateMeme}
          disabled={!selectedTemplate || !characterImage || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Meme'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="meme-error">{error}</div>
      )}

      {/* Generated result */}
      {generatedImage && (
        <div className="generated-result">
          <img src={generatedImage} alt="Generated meme" className="generated-image" />
          <div className="result-actions">
            <button className="meme-btn-small" onClick={() => copyImage(generatedImage)}>Copy</button>
            <button className="meme-btn-small" onClick={() => downloadImage(generatedImage)}>Save</button>
            <button className="meme-btn-small" onClick={() => setGeneratedImage(null)}>Clear</button>
          </div>
        </div>
      )}

      {/* Template Grid */}
      <div className="template-section">
        <p className="template-section-label">
          {selectedTemplate ? `Selected: ${selectedTemplate.name}` : 'Select a Template'}
          {' '}({templates.length})
        </p>
        <div className="template-grid-scroll">
          {isLoading ? (
            <div className="loading-templates">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="loading-templates">No templates found.</div>
          ) : (
            <div className="template-grid">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <img src={template.thumbnailUrl} alt={template.name} className="template-thumb" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
