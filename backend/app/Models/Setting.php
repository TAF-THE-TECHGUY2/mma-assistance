<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Key/value application settings.
 *
 * Values are stored as JSON when an array/object is given, and returned
 * decoded. Scalar strings are stored and returned as-is.
 */
class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Fetch a setting value (JSON-decoded when applicable).
     *
     * @return mixed
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $row = static::query()->where('key', $key)->first();

        if (! $row) {
            return $default;
        }

        $decoded = json_decode((string) $row->value, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $row->value;
    }

    /**
     * Create or update a setting. Arrays are stored as JSON.
     */
    public static function set(string $key, mixed $value): void
    {
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => is_array($value) ? json_encode($value) : $value],
        );
    }
}
