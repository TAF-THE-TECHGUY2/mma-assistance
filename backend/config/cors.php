<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Configures the paths and origins that may participate in cross-origin
    | requests against the Meridian Medical Assistance API. The React/Vite
    | frontend runs on a separate origin in development, so the API and the
    | Sanctum CSRF cookie route must allow cross-origin access.
    |
    */

    'paths' => ['api/*', 'login', 'logout', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_unique(array_merge(
        [
            env('FRONTEND_URL', 'http://localhost:5173'),
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
        ],
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
