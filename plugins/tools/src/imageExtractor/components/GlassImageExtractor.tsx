import React from 'react';
import { useImageExtractor } from '../hooks/useImageExtractor';
import GlassImageExtractorView from './GlassImageExtractorView';

const GlassImageExtractor: React.FC = () => {
  const extractor = useImageExtractor();
  return <GlassImageExtractorView {...extractor} />;
};

export default GlassImageExtractor; 