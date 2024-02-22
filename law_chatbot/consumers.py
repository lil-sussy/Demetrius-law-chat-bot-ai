import json
from channels.generic.websocket import AsyncWebsocketConsumer
from demetriusapp import settings
# consumers.py

import json
import websockets
import asyncio
class TaskProgressConsumer(AsyncWebsocketConsumer):
    def __init__(self):
        self.channels = {}  # Dictionary to store channels and their websockets

    async def create_channel(self, channel_name):
        """ Create a new channel """
        if channel_name not in self.channels:
            self.channels[channel_name] = set()

    async def register(self, websocket, channel_name):
        """ Register a new WebSocket connection for the channel """
        if channel_name in self.channels:
            self.channels[channel_name].add(websocket)

    async def unregister(self, websocket, channel_name):
        """ Unregister a WebSocket connection from the channel """
        if channel_name in self.channels and websocket in self.channels[channel_name]:
            self.channels[channel_name].remove(websocket)

    async def send_message(self, channel_name, message):
        """ Send a message to all WebSockets in a specific channel """
        if channel_name in self.channels:
            websockets = self.channels[channel_name]
            if websockets:  # Check if there are any connections
                await asyncio.wait([ws.send(message) for ws in websockets])

    async def send_progress_update(self, channel_name, collection_name, progress):
        # Call this method to send a progress update to the frontend
        if channel_name in self.channels:
            websockets = self.channels[channel_name]
            if websockets:  # Check if there are any connections
                await asyncio.wait([ws.send(json.dumps({
            'progress': progress,
            'finished': False,
            'collection_name': collection_name,
        })) for ws in websockets])

    async def send_ending_message(self, channel_name, collection_name, message):
        # Call this method to send a progress update to the frontend
        if channel_name in self.channels:
            websockets = self.channels[channel_name]
            if websockets:  # Check if there are any connections
                await asyncio.wait([ws.send(json.dumps({
            'message': message,
            'finished': True,
            'collection_name': collection_name,
        })) for ws in websockets])

    async def handler(self, websocket, path):
        """ Handles incoming WebSocket connections """
        channel_name = path.strip("/")  # Use URL path as channel name
        await self.create_channel(channel_name)
        await self.register(websocket, channel_name)

        try:
            async for message in websocket:
                await self.send_message(channel_name, message)
        finally:
            await self.unregister(websocket, channel_name)
    
async def runserver(consumer):
    async with websockets.serve(consumer.handler, "localhost", settings.WS_PORT):
        await asyncio.Future()  # Run forever