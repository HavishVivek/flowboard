const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, apiKey, model, prompt, parameters } = req.body

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' })
  }

  try {
    if (action === 'test') {
      // Test connection with a simple request
      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'meta-llama/Llama-3.2-3B-Instruct',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        })
      })

      if (response.ok) {
        return res.status(200).json({ success: true, message: 'Connected to Hugging Face!' })
      } else if (response.status === 401) {
        return res.status(200).json({ success: false, message: 'Invalid API key' })
      } else if (response.status === 503) {
        return res.status(200).json({ success: true, message: 'Connected! Model is loading (this is normal for first use)' })
      } else {
        const errorText = await response.text()
        return res.status(200).json({ success: false, message: `API error: ${response.status} - ${errorText}` })
      }
    }

    if (action === 'generate') {
      // Generate text using chat completions format
      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: parameters?.maxTokens || 500,
          temperature: parameters?.temperature || 0.7
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        return res.status(500).json({ error: `Hugging Face API error: ${response.status} - ${errorText}` })
      }

      const data = await response.json()

      // OpenAI format returns choices[0].message.content
      if (data.choices && data.choices[0]?.message?.content) {
        return res.status(200).json([{ generated_text: data.choices[0].message.content }])
      }

      return res.status(500).json({ error: 'Unexpected response format' })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
