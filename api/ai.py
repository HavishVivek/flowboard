from http.server import BaseHTTPRequestHandler
import json
import requests

# HF Inference API endpoint
HF_API_URL = "https://api-inference.huggingface.co/models"

# Models available on free HF Inference API
DEFAULT_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode('utf-8'))
            action = data.get('action')
            api_key = data.get('apiKey')
            model = data.get('model', DEFAULT_MODEL)
            prompt = data.get('prompt', '')
            parameters = data.get('parameters', {})
            tasks = data.get('tasks', [])

            if not api_key:
                return self.send_json_response({'error': 'API key is required'}, 400)

            headers = {"Authorization": f"Bearer {api_key}"}

            if action == 'test':
                return self.handle_test(headers, model)
            elif action == 'generate':
                return self.handle_generate(headers, model, prompt, parameters)
            elif action == 'schedule':
                return self.handle_schedule(headers, model, tasks, parameters)
            elif action == 'suggest':
                return self.handle_suggest(headers, model, tasks, parameters)
            else:
                return self.send_json_response({'error': 'Invalid action'}, 400)

        except json.JSONDecodeError:
            return self.send_json_response({'error': 'Invalid JSON'}, 400)
        except Exception as e:
            return self.send_json_response({'error': str(e)}, 500)

    def query_hf(self, headers, model, payload):
        """Query the HF Inference API"""
        response = requests.post(
            f"{HF_API_URL}/{model}",
            headers=headers,
            json=payload,
            timeout=60
        )
        return response

    def handle_test(self, headers, model):
        """Test connection to HF Inference API"""
        try:
            payload = {
                "inputs": "Hello, respond with 'Connected!'",
                "parameters": {"max_new_tokens": 10}
            }

            response = self.query_hf(headers, model, payload)

            if response.status_code == 200:
                return self.send_json_response({
                    'success': True,
                    'message': f'Connected to HF Inference API! Model: {model}'
                })
            elif response.status_code == 401:
                return self.send_json_response({
                    'success': False,
                    'message': 'Invalid API key'
                })
            elif response.status_code == 503:
                # Model is loading
                return self.send_json_response({
                    'success': True,
                    'message': 'Connected! Model is loading, please wait ~20 seconds and try again.'
                })
            else:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', response.text)
                return self.send_json_response({
                    'success': False,
                    'message': f'API error ({response.status_code}): {error_msg}'
                })

        except requests.exceptions.Timeout:
            return self.send_json_response({
                'success': False,
                'message': 'Request timed out. Model may be loading.'
            })
        except Exception as e:
            return self.send_json_response({
                'success': False,
                'message': f'Error: {str(e)}'
            })

    def handle_generate(self, headers, model, prompt, parameters):
        """General text generation"""
        try:
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": parameters.get('maxTokens', 500),
                    "temperature": parameters.get('temperature', 0.7),
                    "return_full_text": False
                }
            }

            response = self.query_hf(headers, model, payload)

            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    text = result[0].get('generated_text', '')
                    return self.send_json_response([{'generated_text': text}])
                return self.send_json_response([{'generated_text': str(result)}])
            else:
                return self.send_json_response({'error': f'API error: {response.status_code}'}, 500)

        except Exception as e:
            return self.send_json_response({'error': str(e)}, 500)

    def handle_schedule(self, headers, model, tasks, parameters):
        """Generate weekly schedule from tasks"""
        if not tasks:
            return self.send_json_response({'schedule': []})

        # Get next 7 days
        from datetime import datetime, timedelta
        today = datetime.now()
        dates = [(today + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]

        # Build task list for prompt
        task_list = "\n".join([
            f"- ID:{t.get('id')}, Task: {t.get('title')}, Priority: {t.get('priority', 'Medium')}, Due: {t.get('due_date', 'None')}"
            for t in tasks[:12]
        ])

        prompt = f"""<s>[INST] You are a scheduling assistant. Create a weekly schedule for these tasks.

TASKS:
{task_list}

DATES: {', '.join(dates)}
TIME SLOTS: "Morning (6am-12pm)", "Afternoon (12pm-5pm)", "Evening (5pm-9pm)"

RULES:
- High priority tasks go earlier in the week
- Respect due dates (schedule before due date)
- Spread tasks across different days

Respond with ONLY a JSON array, no other text:
[{{"task_id": 1, "date": "YYYY-MM-DD", "time_slot": "Morning (6am-12pm)"}}]
[/INST]"""

        try:
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 600,
                    "temperature": 0.3,
                    "return_full_text": False
                }
            }

            response = self.query_hf(headers, model, payload)

            if response.status_code == 200:
                result = response.json()
                text = ""
                if isinstance(result, list) and len(result) > 0:
                    text = result[0].get('generated_text', '')

                # Parse JSON from response
                schedule = self.extract_json_array(text)

                # Validate schedule items
                valid_schedule = []
                for item in schedule:
                    if item.get('task_id') and item.get('date') and item.get('time_slot'):
                        if item['date'] in dates:
                            valid_schedule.append(item)

                if valid_schedule:
                    return self.send_json_response({'schedule': valid_schedule})

            # Fallback if AI fails
            fallback = self.generate_fallback_schedule(tasks, dates)
            return self.send_json_response({'schedule': fallback, 'fallback': True})

        except Exception as e:
            fallback = self.generate_fallback_schedule(tasks, dates)
            return self.send_json_response({'schedule': fallback, 'fallback': True, 'error': str(e)})

    def handle_suggest(self, headers, model, tasks, parameters):
        """Suggest next task to work on"""
        if not tasks:
            return self.send_json_response({'suggestion': None})

        available_minutes = parameters.get('availableMinutes', 60)

        task_list = "\n".join([
            f"- ID:{t.get('id')}, Task: {t.get('title')}, Priority: {t.get('priority', 'Medium')}, Due: {t.get('due_date', 'None')}"
            for t in tasks[:10]
        ])

        prompt = f"""<s>[INST] You have {available_minutes} minutes. Which task should you work on?

TASKS:
{task_list}

Consider priority and due dates. Respond with ONLY this JSON format:
{{"task_id": <number>, "title": "<task name>", "reason": "<brief reason>"}}
[/INST]"""

        try:
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 150,
                    "temperature": 0.3,
                    "return_full_text": False
                }
            }

            response = self.query_hf(headers, model, payload)

            if response.status_code == 200:
                result = response.json()
                text = ""
                if isinstance(result, list) and len(result) > 0:
                    text = result[0].get('generated_text', '')

                suggestion = self.extract_json_object(text)
                if suggestion:
                    return self.send_json_response({'suggestion': suggestion})

            # Fallback
            return self.fallback_suggestion(tasks)

        except Exception as e:
            return self.fallback_suggestion(tasks)

    def fallback_suggestion(self, tasks):
        """Return highest priority task as fallback"""
        if tasks:
            priority_order = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}
            sorted_tasks = sorted(tasks, key=lambda t: priority_order.get(t.get('priority', 'Medium'), 2))
            top_task = sorted_tasks[0]
            return self.send_json_response({
                'suggestion': {
                    'task_id': top_task.get('id'),
                    'title': top_task.get('title'),
                    'reason': 'Highest priority task'
                },
                'fallback': True
            })
        return self.send_json_response({'suggestion': None})

    def extract_json_array(self, text):
        """Extract JSON array from text"""
        import re
        try:
            match = re.search(r'\[[\s\S]*?\]', text)
            if match:
                return json.loads(match.group())
        except:
            pass
        return []

    def extract_json_object(self, text):
        """Extract JSON object from text"""
        import re
        try:
            match = re.search(r'\{[\s\S]*?\}', text)
            if match:
                return json.loads(match.group())
        except:
            pass
        return None

    def generate_fallback_schedule(self, tasks, dates):
        """Generate simple schedule when AI fails"""
        priority_order = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}
        sorted_tasks = sorted(tasks, key=lambda t: priority_order.get(t.get('priority', 'Medium'), 2))

        schedule = []
        time_slots = ['Morning (6am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-9pm)']

        for i, task in enumerate(sorted_tasks[:14]):
            date_idx = i // 2 % len(dates)
            slot_idx = i % len(time_slots)
            schedule.append({
                'task_id': task.get('id'),
                'date': dates[date_idx],
                'time_slot': time_slots[slot_idx]
            })

        return schedule

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
        return
