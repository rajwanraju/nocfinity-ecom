<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

function validRegistrationPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Casey Customer',
        'email' => 'casey@example.test',
        'phone' => '+1 555 010 9999',
        'password' => 'StrongPass123!',
        'password_confirmation' => 'StrongPass123!',
    ], $overrides);
}

it('registers a customer and returns a customer-ability token', function (): void {
    $response = $this->postJson('/api/v1/auth/register', validRegistrationPayload());

    $response
        ->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.user.email', 'casey@example.test')
        ->assertJsonPath('data.user.type', 'customer')
        ->assertJsonPath('data.abilities', ['customer'])
        ->assertJsonStructure([
            'data' => [
                'user' => ['id', 'name', 'email', 'type', 'is_active', 'created_at'],
                'token',
                'token_type',
                'abilities',
            ],
        ]);

    expect($response->json('data'))->not->toHaveKey('password');

    $user = User::query()->where('email', 'casey@example.test')->firstOrFail();

    expect($user->isCustomer())->toBeTrue()
        ->and($user->is_active)->toBeTrue()
        ->and(Hash::check('StrongPass123!', $user->password))->toBeTrue();
});

it('rejects weak passwords during registration', function (string $password): void {
    $response = $this->postJson('/api/v1/auth/register', validRegistrationPayload([
        'password' => $password,
        'password_confirmation' => $password,
    ]));

    $response->assertUnprocessable()->assertJsonValidationErrors('password');

    expect(User::query()->where('email', 'casey@example.test')->exists())->toBeFalse();
})->with([
    'too short' => ['Short1!'],
    'no uppercase' => ['lowercase123!'],
    'no number' => ['NoNumberHere!'],
    'no symbol' => ['NoSymbols1234'],
]);

it('rejects duplicate email registration', function (): void {
    User::factory()->create(['email' => 'casey@example.test']);

    $this->postJson('/api/v1/auth/register', validRegistrationPayload())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('logs in a customer and returns a token', function (): void {
    User::factory()->create([
        'email' => 'casey@example.test',
        'password' => 'StrongPass123!',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'casey@example.test',
        'password' => 'StrongPass123!',
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('data.user.email', 'casey@example.test')
        ->assertJsonPath('data.abilities', ['customer']);

    expect($response->json('data.token'))->toBeString()->not->toBeEmpty();

    $token = DB::table('personal_access_tokens')->latest('id')->first();

    expect($token)->not->toBeNull()
        ->and($token->expires_at)->not->toBeNull()
        ->and(Carbon::parse($token->expires_at)->isFuture())->toBeTrue();
});

it('rejects a password that appears in a public breach', function (): void {
    config(['auth.password_check_pwned' => true]);

    $password = 'CompromisedPass123!';
    $hash = strtoupper(sha1($password));

    Http::fake([
        'api.pwnedpasswords.com/*' => Http::response(substr($hash, 5).":42\r\n", 200),
    ]);

    $this->postJson('/api/v1/auth/register', validRegistrationPayload([
        'password' => $password,
        'password_confirmation' => $password,
    ]))->assertUnprocessable()->assertJsonValidationErrors('password');

    expect(User::query()->where('email', 'casey@example.test')->exists())->toBeFalse();
});

it('returns the same generic error for unknown, wrong-password and inactive accounts', function (): void {
    User::factory()->create([
        'email' => 'known@example.test',
        'password' => 'StrongPass123!',
    ]);
    User::factory()->inactive()->create([
        'email' => 'inactive@example.test',
        'password' => 'StrongPass123!',
    ]);

    $attempts = [
        ['email' => 'nobody@example.test', 'password' => 'StrongPass123!'],
        ['email' => 'known@example.test', 'password' => 'WrongPass123!'],
        ['email' => 'inactive@example.test', 'password' => 'StrongPass123!'],
    ];

    foreach ($attempts as $attempt) {
        $this->postJson('/api/v1/auth/login', $attempt)
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Invalid credentials.');
    }
});

it('returns the current customer from me', function (): void {
    $user = User::factory()->create(['password' => 'StrongPass123!']);

    $login = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'StrongPass123!',
    ])->json('data.token');

    $this->withToken($login)
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.type', 'customer');
});

it('revokes the token on logout', function (): void {
    $user = User::factory()->create(['password' => 'StrongPass123!']);

    $token = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'StrongPass123!',
    ])->json('data.token');

    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();

    forgetAuthGuards();

    $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
});

it('revokes other tokens when the password changes but keeps the current one', function (): void {
    $user = User::factory()->create(['password' => 'StrongPass123!']);

    $tokenA = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'StrongPass123!',
    ])->json('data.token');

    $tokenB = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'StrongPass123!',
    ])->json('data.token');

    $this->withToken($tokenA)->postJson('/api/v1/auth/change-password', [
        'current_password' => 'StrongPass123!',
        'password' => 'NewStrongPass456!',
        'password_confirmation' => 'NewStrongPass456!',
    ])->assertOk();

    $this->withToken($tokenA)->getJson('/api/v1/auth/me')->assertOk();

    forgetAuthGuards();

    $this->withToken($tokenB)->getJson('/api/v1/auth/me')->assertUnauthorized();

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'StrongPass123!',
    ])->assertUnauthorized();

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'NewStrongPass456!',
    ])->assertOk();
});

it('rejects a password change with the wrong current password', function (): void {
    $user = User::factory()->create(['password' => 'StrongPass123!']);

    $token = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'StrongPass123!',
    ])->json('data.token');

    $this->withToken($token)->postJson('/api/v1/auth/change-password', [
        'current_password' => 'NotThePassword123!',
        'password' => 'NewStrongPass456!',
        'password_confirmation' => 'NewStrongPass456!',
    ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
});
