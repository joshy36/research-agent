# Research Agent

Deep research agent for PubMed.
User inputs a query ->
Parsed into MeSH terms ->
Download full text and metadata of relevant articles ->
Chunk and embed papers ->
Use RAG for responses

## Getting Started

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:

   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_API_KEY=your_google_api_key
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Start the worker process (in a separate terminal):
   ```bash
   npm run dev:worker
   ```

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file with the following variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Tech Stack

### Frontend

- Next.js
- React
- Tailwind CSS
- Shadcn UI
- Supabase client

### Backend

- Node.js
- Express
- TypeScript
- RabbitMQ
- Supabase
- Various AI SDKs (OpenAI, Google, Anthropic)
