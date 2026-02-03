const HF_API_URL = 'https://router.huggingface.co/hf-inference/models'

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
      // Test connection
      const response = await fetch(`${HF_API_URL}/${model || 'mistralai/Mistral-7B-Instruct-v0.2'}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: 'Hello',
          parameters: { max_new_tokens: 10 }
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
      // Generate text
      const response = await fetch(`${HF_API_URL}/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: parameters?.maxTokens || 500,
            temperature: parameters?.temperature || 0.7,
            return_full_text: false
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        return res.status(500).json({ error: `Hugging Face API error: ${response.status} - ${errorText}` })
      }

      const data = await response.json()
      return res.status(200).json(data)
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
