-- Make audio-messages bucket public so recipients can access audio files
UPDATE storage.buckets 
SET public = true 
WHERE id = 'audio-messages';

-- Create policies for public access to audio files
CREATE POLICY "Public can view audio messages" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-messages');

CREATE POLICY "Authenticated users can upload audio messages" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-messages' AND auth.role() = 'authenticated');