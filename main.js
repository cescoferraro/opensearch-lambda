const axios = require("axios");

module.exports.hello = async (event) => {
    const todoItem = await axios('https://jsonplaceholder.typicode.com/todos/1');
    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                message: 'Some Message Here',
                input: event,
            },
            null,
            2
        ),
    };
};