from http.server import BaseHTTPRequestHandler
import json
from huggingface_hub import InferenceClient

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode('utf-8'))
            action = data.get('action')
            api_key = data.get('apiKey')
            model = data.get('model', 'meta-llama/Llama-3.2-3B-Instruct')
            prompt = data.get('prompt', '')
            parameters = data.get('parameters', {})

            if not api_key:
                self.send_error_response({'error': 'API key is required'}, 400)
                return

            client = InferenceClient(token=api_key)

            if action == 'test':
                try:
                    # Test with a simple request
                    response = client.chat_completion(
                        model=model,
                        messages=[{"role": "user", "content": "Hi"}],
                        max_tokens=5
                    )
                    self.send_json_response({'success': True, 'message': 'Connected to Hugging Face!'})
                except Exception as e:
                    error_msg = str(e)
                    if '401' in error_msg or 'unauthorized' in error_msg.lower():
                        self.send_json_response({'success': False, 'message': 'Invalid API key'})
                    elif '503' in error_msg:
                        self.send_json_response({'success': True, 'message': 'Connected! Model is loading...'})
                    else:
                        self.send_json_response({'success': False, 'message': f'Error: {error_msg}'})

            elif action == 'generate':
                try:
                    response = client.chat_completion(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=parameters.get('maxTokens', 500),
                        temperature=parameters.get('temperature', 0.7)
                    )
                    generated_text = response.choices[0].message.content
                    self.send_json_response([{'generated_text': generated_text}])
                except Exception as e:
                    self.send_error_response({'error': str(e)}, 500)

            else:
                self.send_error_response({'error': 'Invalid action'}, 400)

        except Exception as e:
            self.send_error_response({'error': str(e)}, 500)

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, data, status):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
