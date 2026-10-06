import "package:supabase_flutter/supabase_flutter.dart";

import "config.dart";
import "models.dart";

class ShopRepository {
  ShopRepository(this.client);

  final SupabaseClient client;

  String imageUrl(String path) {
    if (path.startsWith("http")) return path;
    return "$assetHost$path";
  }

  Future<List<Product>> products() async {
    final rows = await client.from("products").select().order("sort_order");
    return (rows as List).map((row) => Product.fromJson(Map<String, dynamic>.from(row as Map))).toList();
  }

  Future<List<CartLine>> cart() async {
    final user = client.auth.currentUser;
    if (user == null) return const [];
    final rows = await client
        .from("cart_items")
        .select("quantity, products(id, name, category, description, price_cents, image_path, specs)")
        .eq("user_id", user.id);
    return (rows as List).map((raw) {
      final row = Map<String, dynamic>.from(raw as Map);
      final productJson = row["products"];
      final productMap = productJson is List ? productJson.first : productJson;
      return CartLine(
        product: Product.fromJson(Map<String, dynamic>.from(productMap as Map)),
        quantity: (row["quantity"] as num).toInt(),
      );
    }).toList();
  }

  Future<void> setQuantity(String productId, int quantity) async {
    final user = client.auth.currentUser;
    if (user == null) return;
    if (quantity < 1) {
      await client.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
      return;
    }
    await client.from("cart_items").upsert(
      {
        "user_id": user.id,
        "product_id": productId,
        "quantity": quantity > 10 ? 10 : quantity,
        "updated_at": DateTime.now().toUtc().toIso8601String(),
      },
      onConflict: "user_id,product_id",
    );
  }

  Future<void> clearCart() async {
    final user = client.auth.currentUser;
    if (user == null) return;
    await client.from("cart_items").delete().eq("user_id", user.id);
  }

  Future<String> placeOrder(List<CartLine> lines) async {
    final response = await client.rpc("place_order", params: {
      "items": lines
          .map((line) => {"productId": line.product.id, "quantity": line.quantity})
          .toList(),
    });
    await clearCart();
    return response.toString();
  }

  Future<List<ShopOrder>> orders() async {
    final rows = await client
        .from("orders")
        .select("id, email, status, total_cents, created_at, order_items(product_name, quantity, unit_price_cents)")
        .order("created_at", ascending: false);
    return (rows as List).map((raw) {
      final row = Map<String, dynamic>.from(raw as Map);
      final items = (row["order_items"] as List? ?? []).map((itemRaw) {
        final item = Map<String, dynamic>.from(itemRaw as Map);
        return OrderLine(
          name: item["product_name"] as String,
          quantity: (item["quantity"] as num).toInt(),
          unitPriceCents: (item["unit_price_cents"] as num).toInt(),
        );
      }).toList();
      return ShopOrder(
        id: row["id"] as String,
        email: (row["email"] as String?) ?? "",
        status: row["status"] as String,
        totalCents: (row["total_cents"] as num).toInt(),
        createdAt: DateTime.parse(row["created_at"] as String).toLocal(),
        items: items,
      );
    }).toList();
  }
}
