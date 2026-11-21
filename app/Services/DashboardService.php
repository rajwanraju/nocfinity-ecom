<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * FR-ADMIN-1: the numbers behind the admin home screen. Every figure is
 * aggregated on the server from the database; the client only picks a range.
 */
class DashboardService
{
    public function __construct(private readonly SettingService $settings) {}

    /**
     * @return array{
     *     today_orders: int,
     *     today_revenue: int,
     *     total_customers: int,
     *     low_stock_count: int,
     *     sales_series: list<array{date: string, orders: int, revenue: int}>,
     *     recent_orders: array<string, mixed>
     * }
     */
    public function summary(): array
    {
        return [
            'today_orders' => $this->todayOrders(),
            'today_revenue' => $this->todayRevenue(),
            'total_customers' => $this->totalCustomers(),
            'low_stock_count' => $this->lowStockCount(),
            'sales_series' => $this->salesSeries(),
            'recent_orders' => $this->recentOrders(),
        ];
    }

    private function todayOrders(): int
    {
        return Order::query()->whereDate('created_at', now()->toDateString())->count();
    }

    /**
     * FR-ADMIN-1: revenue counts orders that actually captured money today.
     */
    private function todayRevenue(): int
    {
        return (int) Order::query()
            ->whereIn('status', $this->paidStatuses())
            ->whereDate('paid_at', now()->toDateString())
            ->sum('grand_total');
    }

    private function totalCustomers(): int
    {
        return User::query()->where('type', UserType::Customer)->count();
    }

    private function lowStockCount(): int
    {
        $threshold = $this->settings->integer('products.low_stock_threshold', 5);

        return Product::query()
            ->where('is_active', true)
            ->where('stock', '<=', $threshold)
            ->count();
    }

    /**
     * Last 30 calendar days (including today) with paid orders and revenue.
     *
     * @return list<array{date: string, orders: int, revenue: int}>
     */
    private function salesSeries(): array
    {
        $rows = Order::query()
            ->selectRaw('DATE(paid_at) as day, COUNT(*) as orders, SUM(grand_total) as revenue')
            ->whereIn('status', $this->paidStatuses())
            ->where('paid_at', '>=', CarbonImmutable::today()->subDays(29)->toDateTimeString())
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $series = [];

        for ($offset = 29; $offset >= 0; $offset--) {
            $date = CarbonImmutable::today()->subDays($offset);
            $row = $rows->get($date->toDateString());

            $series[] = [
                'date' => $date->toDateString(),
                'orders' => (int) ($row->orders ?? 0),
                'revenue' => (int) ($row->revenue ?? 0),
            ];
        }

        return $series;
    }

    /**
     * @return array<string, mixed>
     */
    private function recentOrders(): array
    {
        return Order::query()
            ->with(['user:id,name,email', 'items:id,order_id,product_name,quantity'])
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status->value,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'grand_total' => $order->grand_total,
                'placed_at' => $order->placed_at?->toIso8601String(),
                'items_count' => $order->items->sum('quantity'),
            ])
            ->all();
    }

    /**
     * @return list<string>
     */
    private function paidStatuses(): array
    {
        return array_map(
            fn (OrderStatus $status): string => $status->value,
            array_filter(
                OrderStatus::cases(),
                fn (OrderStatus $status): bool => $status->isPaid(),
            ),
        );
    }
}
