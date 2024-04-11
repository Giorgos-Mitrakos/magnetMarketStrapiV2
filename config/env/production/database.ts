export default ({ env }) => ({
    connection: {
        client: 'mysql',
        connection: {
            host: env('DATABASE_HOST', '127.0.0.1'),
            port: env.int('DATABASE_PORT', 3306),
            database: env('DATABASE_NAME', 'magnetdev'),
            user: env('DATABASE_USERNAME', 'magnet_next'),
            password: env('DATABASE_PASSWORD', 'M@gn3t78#@!'),
            ssl: env.bool('DATABASE_SSL', false),
        },
    },
});