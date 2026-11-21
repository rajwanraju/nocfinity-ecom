<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
    actingAsSuperAdmin();
});

it('creates a category and generates a unique slug', function (): void {
    $this->postJson('/api/v1/admin/categories', [
        'name' => 'Living Room',
        'description' => 'Sofas and tables',
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Living Room')
        ->assertJsonPath('data.slug', 'living-room')
        ->assertJsonPath('data.is_active', true);

    $this->assertDatabaseHas('categories', ['slug' => 'living-room']);
});

it('rejects a duplicate category slug', function (): void {
    Category::factory()->create(['slug' => 'lighting']);

    $this->postJson('/api/v1/admin/categories', [
        'name' => 'Lighting',
        'slug' => 'lighting',
    ])->assertUnprocessable()->assertJsonValidationErrors(['slug']);
});

it('moves a category under a valid parent', function (): void {
    $parent = Category::factory()->create();
    $child = Category::factory()->create(['parent_id' => $parent->id]);

    $this->patchJson("/api/v1/admin/categories/{$child->id}", [
        'parent_id' => $parent->id,
        'name' => 'Renamed Child',
    ])->assertOk()
        ->assertJsonPath('data.name', 'Renamed Child')
        ->assertJsonPath('data.parent_id', $parent->id);
});

it('refuses to make a category its own parent or a child of its descendant', function (): void {
    $root = Category::factory()->create();
    $child = Category::factory()->create(['parent_id' => $root->id]);

    $this->patchJson("/api/v1/admin/categories/{$root->id}", [
        'parent_id' => $root->id,
    ])->assertUnprocessable()->assertJsonValidationErrors(['parent_id']);

    $this->patchJson("/api/v1/admin/categories/{$root->id}", [
        'parent_id' => $child->id,
    ])->assertUnprocessable()->assertJsonValidationErrors(['parent_id']);
});

it('blocks deleting a category with children or products', function (): void {
    $parent = Category::factory()->create();
    Category::factory()->create(['parent_id' => $parent->id]);

    $this->deleteJson("/api/v1/admin/categories/{$parent->id}")->assertStatus(409);

    $category = Category::factory()->create();
    Product::factory()->create(['category_id' => $category->id]);

    $this->deleteJson("/api/v1/admin/categories/{$category->id}")->assertStatus(409);
});

it('deletes an empty category', function (): void {
    $category = Category::factory()->create();

    $this->deleteJson("/api/v1/admin/categories/{$category->id}")->assertNoContent();

    $this->assertSoftDeleted('categories', ['id' => $category->id]);
});

it('hides the admin category list from roles without categories.manage', function (): void {
    $support = User::factory()->staff()->create();
    $support->assignRole('Support');
    Sanctum::actingAs($support, ['staff']);

    $this->getJson('/api/v1/admin/categories')->assertForbidden();
});

it('validates category input', function (): void {
    $this->postJson('/api/v1/admin/categories', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);

    $this->postJson('/api/v1/admin/categories', [
        'name' => 'Bad Parent',
        'parent_id' => 999999,
    ])->assertUnprocessable()->assertJsonValidationErrors(['parent_id']);
});
