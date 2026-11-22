<?php

use App\Enums\OrderStatus;

it('allows only the documented order status transitions', function (): void {
    expect(OrderStatus::Pending->allowedTransitions())
        ->toEqualCanonicalizing([OrderStatus::Paid, OrderStatus::Cancelled])
        ->and(OrderStatus::Paid->allowedTransitions())
        ->toEqualCanonicalizing([OrderStatus::Processing, OrderStatus::Cancelled])
        ->and(OrderStatus::Processing->allowedTransitions())
        ->toEqualCanonicalizing([OrderStatus::Shipped, OrderStatus::Cancelled])
        ->and(OrderStatus::Shipped->allowedTransitions())
        ->toEqual([OrderStatus::Delivered])
        ->and(OrderStatus::Delivered->allowedTransitions())->toBe([])
        ->and(OrderStatus::Cancelled->allowedTransitions())->toBe([]);
});

it('rejects transitions that would reverse or skip the lifecycle', function (): void {
    expect(OrderStatus::Pending->canTransitionTo(OrderStatus::Shipped))->toBeFalse()
        ->and(OrderStatus::Delivered->canTransitionTo(OrderStatus::Paid))->toBeFalse()
        ->and(OrderStatus::Cancelled->canTransitionTo(OrderStatus::Pending))->toBeFalse()
        ->and(OrderStatus::Pending->canTransitionTo(OrderStatus::Paid))->toBeTrue();
});

it('marks the paid states and cancellable states explicitly', function (): void {
    expect(OrderStatus::Paid->isPaid())->toBeTrue()
        ->and(OrderStatus::Processing->isPaid())->toBeTrue()
        ->and(OrderStatus::Pending->isPaid())->toBeFalse()
        ->and(OrderStatus::Cancelled->isPaid())->toBeFalse()
        ->and(OrderStatus::Pending->isCancellable())->toBeTrue()
        ->and(OrderStatus::Shipped->isCancellable())->toBeFalse()
        ->and(OrderStatus::Delivered->isTerminal())->toBeTrue();
});
