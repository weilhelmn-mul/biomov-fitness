import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const config = {
    status: supabaseUrl && supabaseAnonKey ? 'CONFIGURED' : 'NOT_CONFIGURED',
    environment: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl || 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET (hidden)' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET (hidden)' : 'NOT_SET',
    },
    instructions: supabaseUrl && supabaseAnonKey ? null : {
      step1: 'Go to Vercel Dashboard > Your Project > Settings > Environment Variables',
      step2: 'Add NEXT_PUBLIC_SUPABASE_URL = https://ysqlqyrxcqdfoagplkik.supabase.co',
      step3: 'Add NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key',
      step4: 'Redeploy the project'
    },
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(config)
}
