import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ message: 'No image provided' }, { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const result = await cloudinary.uploader.upload(image, {
      folder: 'durabel/vendly/categories',
      format: 'webp',
      timestamp,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    return NextResponse.json({ imageUrl: result.secure_url });
  } catch (error: any) {
    console.error('Category image upload error:', error);
    return NextResponse.json({ message: error?.message || 'Upload failed' }, { status: 500 });
  }
}
