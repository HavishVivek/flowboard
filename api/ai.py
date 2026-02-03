from http.server import BaseHTTPRequestHandler
import json
import os
from huggingface_hub import InferenceClient

# Recommended models (in order of preference)
# These are available on the free Serverless Inference API
MODELS = [
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "meta-llama/Meta-Llama-3-8B-Instruct",
    "HuggingFaceH4/zephyr-7b-beta",
    "microsoft/DialoGPT-large"
]

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
            model = data.get('model', MODELS[0])
            prompt = data.get('prompt', '')
            parameters = data.get('parameters', {})
            tasks = data.get('tasks', [])

            if not api_key:
                return self.send_json_response({'error': 'API key is required'}, 400)

            # Initialize the client
            client = InferenceClient(token=api_key)

            if action == 'test':
                return self.handle_test(client, model)
            elif action == 'generate':
                return self.handle_generate(client, model, prompt, parameters)
            elif action == 'schedule':
                return self.handle_schedule(client, model, tasks, parameters)
            elif action == 'suggest':
                return self.handle_suggest(client, model, tasks, parameters)
            else:
                return self.send_json_response({'error': 'Invalid action'}, 400)

        except json.JSONDecodeError:
            return self.send_json_response({'error': 'Invalid JSON'}, 400)
        except Exception as e:
            return self.send_json_response({'error': str(e)}, 500)

    def handle_test(self, client, model):
        """Test connection to Hugging Face"""
        try:
            # Try with the specified model first
            response = client.text_generation(
                prompt="Say 'connected' in one word:",
                model=model,
                max_new_tokens=10
            )
            return self.send_json_response({
                'success': True,
                'message': f'Connected to Hugging Face! Using model: {model}'
            })
        except Exception as e:
            error_msg = str(e)
            if '401' in error_msg or 'unauthorized' in error_msg.lower():
                return self.send_json_response({'success': False, 'message': 'Invalid API key'})
            elif '503' in error_msg or 'loading' in error_msg.lower():
                return self.send_json_response({'success': True, 'message': 'Connected! Model is loading (wait a moment)...'})
            elif 'not supported' in error_msg.lower() or '404' in error_msg:
                # Try fallback models
                for fallback_model in MODELS[1:]:
                    try:
                        client.text_generation(
                            prompt="Hi",
                            model=fallback_model,
                            max_new_tokens=5
                        )
                        return self.send_json_response({
                            'success': True,
                            'message': f'Connected! Using fallback model: {fallback_model}'
                        })
                    except:
                        continue
                return self.send_json_response({
                    'success': False,
                    'message': 'No supported models available. Enable providers at huggingface.co/settings/inference-providers'
                })
            else:
                return self.send_json_response({'success': False, 'message': f'Error: {error_msg}'})

    def handle_generate(self, client, model, prompt, parameters):
        """General text generation"""
        try:
            response = client.text_generation(
                prompt=prompt,
                model=model,
                max_new_tokens=parameters.get('maxTokens', 500),
                temperature=parameters.get('temperature', 0.7),
                return_full_text=False
            )
            return self.send_json_response([{'generated_text': response}])
        except Exception as e:
            return self.send_json_response({'error': str(e)}, 500)

    def handle_schedule(self, client, model, tasks, parameters):
        """Generate weekly schedule from tasks"""
        if not tasks:
            return self.send_json_response({'schedule': []})

        # Build the prompt
        task_list = "\n".join([
            f"- ID:{t.get('id')}, Task: {t.get('title')}, Priority: {t.get('priority', 'Medium')}, Due: {t.get('due_date', 'None')}"
            for t in tasks[:15]  # Limit to 15 tasks
        ])

        # Get next 7 days
        from datetime import datetime, timedelta
        today = datetime.now()
        dates = [(today + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]

        prompt = f"""You are a scheduling assistant. Create a weekly schedule for these tasks.

TASKS:
{task_list}

AVAILABLE DATES: {', '.join(dates)}
TIME SLOTS: Morning (6am-12pm), Afternoon (12pm-5pm), Evening (5pm-9pm)

RULES:
- Schedule high priority tasks earlier
- Respect due dates
- Balance workload across days

OUTPUT FORMAT (JSON array only, no other text):
[{{"task_id": 1, "date": "YYYY-MM-DD", "time_slot": "Morning (6am-12pm)"}}]

JSON:"""

        try:
            response = client.text_generation(
                prompt=prompt,
                model=model,
                max_new_tokens=800,
                temperature=0.3,
                return_full_text=False
            )

            # Parse JSON from response
            schedule = self.extract_json_array(response)

            # Validate schedule items
            valid_schedule = []
            for item in schedule:
                if item.get('task_id') and item.get('date') and item.get('time_slot'):
                    if item['date'] in dates:
                        valid_schedule.append(item)

            return self.send_json_response({'schedule': valid_schedule})

        except Exception as e:
            # Return fallback schedule on error
            fallback = self.generate_fallback_schedule(tasks, dates)
            return self.send_json_response({'schedule': fallback, 'fallback': True})

    def handle_suggest(self, client, model, tasks, parameters):
        """Suggest next task to work on"""
        if not tasks:
            return self.send_json_response({'suggestion': None})

        available_minutes = parameters.get('availableMinutes', 60)

        task_list = "\n".join([
            f"- ID:{t.get('id')}, Task: {t.get('title')}, Priority: {t.get('priority', 'Medium')}, Due: {t.get('due_date', 'None')}"
            for t in tasks[:10]
        ])

        prompt = f"""You have {available_minutes} minutes available. Which task should you work on?

TASKS:
{task_list}

Consider priority and due dates. Respond with JSON only:
{{"task_id": <id>, "title": "<task name>", "reason": "<brief reason>"}}

JSON:"""

        try:
            response = client.text_generation(
                prompt=prompt,
                model=model,
                max_new_tokens=150,
                temperature=0.3,
                return_full_text=False
            )

            suggestion = self.extract_json_object(response)
            return self.send_json_response({'suggestion': suggestion})

        except Exception as e:
            # Fallback: return highest priority task
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
            # Find JSON array pattern
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
        """Generate a simple schedule when AI fails"""
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
