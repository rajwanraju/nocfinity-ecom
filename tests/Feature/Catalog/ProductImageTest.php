<?php

use App\Models\Product;
use App\Models\ProductImage;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    Storage::fake('public');

    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();

    $this->product = Product::factory()->create();
});

function uploadImage(int $productId, string $name = 'photo.jpg', ?string $mime = null): array
{
    $file = $mime === 'application/pdf'
        ? UploadedFile::fake()->create($name, 100, $mime)
        : UploadedFile::fake()->image($name, 600, 600);

    $response = test()->post("/api/v1/admin/products/{$productId}/images", ['image' => $file], ['Accept' => 'application/json']);

    return [$response, $response->json('data')];
}

it('uploads an image with a random filename and makes the first one primary', function (): void {
    [$response, $image] = uploadImage($this->product->id, 'front-photo.jpg');

    $response->assertCreated()
        ->assertJsonPath('data.is_primary', true)
        ->assertJsonPath('data.alt', null);

    expect($image['path'])->not->toBe('front-photo.jpg')
        ->and($image['path'])->toStartWith('products/')
        ->and($image['url'])->toContain('/storage/');

    Storage::disk('public')->assertExists($image['path']);
});

it('accepts png and webp uploads', function (): void {
    $png = UploadedFile::fake()->image('image.png', 200, 200);
    $webp = UploadedFile::fake()->image('image.webp', 200, 200);

    $this->post("/api/v1/admin/products/{$this->product->id}/images", ['image' => $png], ['Accept' => 'application/json'])
        ->assertCreated();

    $this->post("/api/v1/admin/products/{$this->product->id}/images", ['image' => $webp], ['Accept' => 'application/json'])
        ->assertCreated();
});

it('rejects unsupported file types and oversized images', function (): void {
    [$pdf] = uploadImage($this->product->id, 'document.pdf', 'application/pdf');
    $pdf->assertUnprocessable()->assertJsonValidationErrors(['image']);

    $tooBig = UploadedFile::fake()->image('big.jpg')->size(3000);

    $this->post("/api/v1/admin/products/{$this->product->id}/images", ['image' => $tooBig], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['image']);
});

it('keeps exactly one primary image', function (): void {
    [$firstResponse, $first] = uploadImage($this->product->id);
    [$secondResponse, $second] = uploadImage($this->product->id);

    $secondResponse->assertCreated()->assertJsonPath('data.is_primary', false);

    $this->patchJson("/api/v1/admin/products/{$this->product->id}/images/{$second['id']}", [
        'is_primary' => true,
    ])->assertOk();

    expect(ProductImage::query()->where('product_id', $this->product->id)->where('is_primary', true)->count())->toBe(1);

    $this->assertDatabaseHas('product_images', ['id' => $second['id'], 'is_primary' => true]);
    $this->assertDatabaseHas('product_images', ['id' => $first['id'], 'is_primary' => false]);
});

it('reorders images', function (): void {
    [, $first] = uploadImage($this->product->id);
    [, $second] = uploadImage($this->product->id);
    [, $third] = uploadImage($this->product->id);

    $this->patchJson("/api/v1/admin/products/{$this->product->id}/images/reorder", [
        'images' => [$third['id'], $first['id'], $second['id']],
    ])->assertOk();

    expect(ProductImage::query()->find($third['id'])->sort_order)->toBe(0)
        ->and(ProductImage::query()->find($first['id'])->sort_order)->toBe(1)
        ->and(ProductImage::query()->find($second['id'])->sort_order)->toBe(2);
});

it('deletes an image file and promotes the next primary image', function (): void {
    [, $primary] = uploadImage($this->product->id);
    [, $next] = uploadImage($this->product->id);

    $this->deleteJson("/api/v1/admin/products/{$this->product->id}/images/{$primary['id']}")->assertNoContent();

    Storage::disk('public')->assertMissing($primary['path']);

    $this->assertDatabaseMissing('product_images', ['id' => $primary['id']]);
    $this->assertDatabaseHas('product_images', ['id' => $next['id'], 'is_primary' => true]);
});

it('cannot modify an image that belongs to another product', function (): void {
    $other = Product::factory()->create();
    $image = ProductImage::query()->create([
        'product_id' => $other->id,
        'path' => 'products/other.jpg',
        'is_primary' => true,
        'sort_order' => 0,
    ]);

    $this->patchJson("/api/v1/admin/products/{$this->product->id}/images/{$image->id}", [
        'alt' => 'stolen',
    ])->assertNotFound();

    $this->assertDatabaseHas('product_images', ['id' => $image->id, 'alt' => null]);
});

it('validates reorder payloads', function (): void {
    [, $image] = uploadImage($this->product->id);

    $this->patchJson("/api/v1/admin/products/{$this->product->id}/images/reorder", [
        'images' => [$image['id'], 999999],
    ])->assertUnprocessable();
});
