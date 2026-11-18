<?php

use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Setting;
use App\Models\User;
use App\Services\SettingService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

it('seeds the complete demo dataset from scratch', function (): void {
    $this->seed();

    expect(Role::count())->toBe(5)
        ->and(Permission::count())->toBe(13)
        ->and(User::where('type', UserType::Staff)->count())->toBe(5)
        ->and(User::where('type', UserType::Customer)->count())->toBe(5)
        ->and(Category::whereNull('parent_id')->count())->toBe(3)
        ->and(Category::count())->toBe(13)
        ->and(Product::count())->toBe(26)
        ->and(Coupon::count())->toBe(3)
        ->and(Order::count())->toBe(6);
});

it('seeds one order in every required status', function (): void {
    $this->seed();

    $statuses = Order::query()->pluck('status')->map->value->sort()->values()->all();

    expect($statuses)->toBe([
        'cancelled',
        'delivered',
        'paid',
        'pending',
        'processing',
        'shipped',
    ]);
});

it('seeds a secure Super Admin with all permissions and documented password', function (): void {
    $this->seed();

    $admin = User::query()->where('email', 'admin@nocfinity.test')->firstOrFail();

    expect($admin->isStaff())->toBeTrue()
        ->and($admin->isSuperAdmin())->toBeTrue()
        ->and($admin->password)->not->toBe('SuperAdmin123!')
        ->and(Hash::check('SuperAdmin123!', $admin->password))->toBeTrue()
        ->and($admin->getAllPermissions())->toHaveCount(13)
        ->and(password_get_info($admin->password)['options']['cost'] ?? null)->toBe(12);
});

it('stores product images locally and snapshots order items', function (): void {
    $this->seed();

    $image = ProductImage::query()->firstOrFail();

    expect(Storage::disk('public')->exists($image->path))->toBeTrue();

    $order = Order::query()->with('items', 'statusHistories')->whereHas('items')->firstOrFail();

    expect($order->items)->not->toBeEmpty()
        ->and($order->items->first()->product_name)->not->toBeEmpty()
        ->and($order->items->first()->product_sku)->toStartWith('NOC-')
        ->and($order->statusHistories)->not->toBeEmpty();
});

it('exposes typed settings through the cached service', function (): void {
    $this->seed();

    $service = app(SettingService::class);

    expect($service->integer('shipping.flat_fee'))->toBe(999)
        ->and($service->integer('shipping.free_threshold'))->toBe(10000)
        ->and($service->integer('tax.percent'))->toBe(0)
        ->and($service->get('store.name'))->toBe('Nocfinity')
        ->and(Setting::query()->where('key', 'currency')->value('value'))->toBe('USD');
});

it('rejects unknown order transitions at the enum level', function (): void {
    expect(OrderStatus::Pending->canTransitionTo(OrderStatus::Paid))->toBeTrue()
        ->and(OrderStatus::Pending->canTransitionTo(OrderStatus::Shipped))->toBeFalse()
        ->and(OrderStatus::Delivered->canTransitionTo(OrderStatus::Cancelled))->toBeFalse()
        ->and(OrderStatus::Cancelled->isTerminal())->toBeTrue();
});
