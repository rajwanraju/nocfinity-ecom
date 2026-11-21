<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cart\AddCartItemRequest;
use App\Http\Requests\Cart\ApplyCouponRequest;
use App\Http\Requests\Cart\UpdateCartItemRequest;
use App\Models\Cart;
use App\Services\CartService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Guest and customer cart endpoints. Authentication is optional: the service
 * resolves the customer from the Sanctum guard, otherwise from the guest
 * cart token. The frontend never sends prices (FR-CART-4 / SEC-1).
 */
class CartController extends Controller
{
    public function __construct(private readonly CartService $carts) {}

    public function show(Request $request): JsonResponse
    {
        return $this->respond($this->carts->resolve($request), 'Cart loaded.');
    }

    public function storeItem(AddCartItemRequest $request): JsonResponse
    {
        $cart = $this->carts->resolve($request);

        $this->carts->addItem($cart, $request->integer('product_id'), $request->integer('quantity'));

        return $this->respond($cart, 'Item added to cart.');
    }

    public function updateItem(UpdateCartItemRequest $request, int $item): JsonResponse
    {
        $cart = $this->carts->resolve($request);

        $this->carts->updateItem($cart, $item, $request->integer('quantity'));

        return $this->respond($cart, 'Cart updated.');
    }

    public function destroyItem(Request $request, int $item): JsonResponse
    {
        $cart = $this->carts->resolve($request);

        $this->carts->removeItem($cart, $item);

        return ApiResponse::noContent();
    }

    public function clear(Request $request): JsonResponse
    {
        $this->carts->clear($this->carts->resolve($request));

        return ApiResponse::noContent();
    }

    public function applyCoupon(ApplyCouponRequest $request): JsonResponse
    {
        $cart = $this->carts->resolve($request);

        $this->carts->applyCoupon(
            $cart,
            $request->string('code')->toString(),
            $request->user('sanctum'),
        );

        return $this->respond($cart, 'Coupon applied.');
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        $cart = $this->carts->resolve($request);

        $this->carts->removeCoupon($cart);

        return $this->respond($cart, 'Coupon removed.');
    }

    private function respond(Cart $cart, string $message): JsonResponse
    {
        $token = $cart->cart_token;

        $response = ApiResponse::success(
            $this->carts->present($cart),
            $message,
            $token === null ? [] : ['cart_token' => $token],
        );

        if ($token !== null) {
            // httpOnly: BFF clients read the token from meta and store it in
            // their own cookie; this cookie keeps plain API clients working.
            $response->withCookie(cookie(
                name: 'cart_token',
                value: $token,
                minutes: 60 * 24 * 30,
                path: '/',
                secure: request()->isSecure(),
                httpOnly: true,
                sameSite: 'lax',
            ));
        }

        return $response;
    }
}
