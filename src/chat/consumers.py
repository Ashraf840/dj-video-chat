import json
from channels.generic.websocket import AsyncWebsocketConsumer


# define asynchronous functions inside a class which will extend the AsyncWebsocketConsumer
class ChatConsumer(AsyncWebsocketConsumer):
    # a client (browser) will connect to this consumer using this following func
    async def connect(self):
        # instantiate a room-group-name (initially there will be only one group-room for now)
        self.room_group_name = 'Test-Room'
        print( 'A room group %s is created!' % self.room_group_name )

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # accept the peer connection
        await self.accept()
        print('Connected (Backend Channel Consumer)!')



    # a client (browser) will receive request/msg requests in real-time using this consumer's func
    # from our JS websocket, we're going to send a js-dict in json format to this dj-consumer.
    # but when we receive the json-dict-data, we need to de-serialize the dictionary using the "json.loads()". Now it'll become a python dict.
    async def receive(self, text_data):
        receive_dict = json.loads(text_data)   # convert the json-dict into python-dict
        message = receive_dict['message']     # extract the message from the converted-python-dict, cause we're going to send a dict which has that msg attribute.
        # [NOTE]:  Thus, we need to construct an object (dictionary) with a 'message'-key from the frontend & then serialize that into JSON-obj before sending that into the backend consumer.

        print('The payload (sent from the frontend):', message)

        # now we will send/broadcast the msg to all the other peers of the group.
        await self.channel_layer.group_send(
            # send the room-group-name
            self.room_group_name,
            {
                # [Compulsory Key] define the type, which will be corresponding to the async-func-name. The mentioning func will be used by the consumer to send the dict/msg to all the peers of the group.
                'type': 'send_message',
                # payload, received from a client (peer) of a room/group
                'payload': message
            }
        )

    # this func will be used while send the msg-payload to each peer of the group/room.
    async def send_message(self, event):
        message = event['payload']  # get the key from the "channel_layer.group_send()" method
        # broadcast the msg to all the peers of the group through channels. Using param "text_data" & serialize the python-dict into a json-dict using the "json.dumps()" message.
        await self.send(text_data=json.dumps({
            'message': message,
        }))


    # a client (browser) will disconnect from this consumer using this following func
    async def disconnect(self, close_code):
        # [NOTE]:  Whenever a user disconnects the, they simply discards their channel-names fom the group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print('Disconnected (Backend Channel Consumer)!')

