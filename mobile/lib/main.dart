import "dart:async";

import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "config.dart";
import "models.dart";
import "shop_repository.dart";

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, publishableKey: supabaseAnonKey);
  runApp(const LoadoutApp());
}

class LoadoutApp extends StatelessWidget {
  const LoadoutApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Loadout",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF10130F),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFD6FF4A),
          onPrimary: Color(0xFF14180F),
          surface: Color(0xFF191D17),
          onSurface: Color(0xFFF4F1E8),
          error: Color(0xFFFF4D1C),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF10130F),
          foregroundColor: Color(0xFFF4F1E8),
          elevation: 0,
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: const Color(0xFF191D17),
          indicatorColor: const Color(0xFFD6FF4A),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return TextStyle(color: selected ? const Color(0xFF14180F) : const Color(0xFFA3AAA0));
          }),
        ),
      ),
      home: const ShopShell(),
    );
  }
}

class ShopShell extends StatefulWidget {
  const ShopShell({super.key});

  @override
  State<ShopShell> createState() => _ShopShellState();
}

class _ShopShellState extends State<ShopShell> {
  late final ShopRepository _shop = ShopRepository(Supabase.instance.client);
  int _index = 0;
  String? _notice;

  @override
  void initState() {
    super.initState();
    Supabase.instance.client.auth.onAuthStateChange.listen((_) {
      if (mounted) setState(() {});
    });
  }

  Future<void> _signIn() async {
    setState(() => _notice = null);
    try {
      await Supabase.instance.client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: authRedirect,
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
    } catch (error) {
      setState(() => _notice = "Google sign-in did not open. $error");
    }
  }

  Future<void> _signOut() async {
    await Supabase.instance.client.auth.signOut();
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final pages = [
      ShopPage(shop: _shop),
      CartPage(shop: _shop, signedIn: user != null, onSignIn: _signIn),
      OrdersPage(shop: _shop, signedIn: user != null, onSignIn: _signIn),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text("LOADOUT  18+"),
        actions: [
          if (user == null)
            TextButton(onPressed: _signIn, child: const Text("Sign in"))
          else
            TextButton(onPressed: _signOut, child: const Text("Sign out")),
        ],
      ),
      body: Column(
        children: [
          if (_notice != null)
            MaterialBanner(
              content: Text(_notice!),
              actions: [TextButton(onPressed: () => setState(() => _notice = null), child: const Text("Close"))],
            ),
          Expanded(child: pages[_index]),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: "Shop"),
          NavigationDestination(icon: Icon(Icons.shopping_bag_outlined), selectedIcon: Icon(Icons.shopping_bag), label: "Cart"),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: "Orders"),
        ],
      ),
    );
  }
}

class ShopPage extends StatefulWidget {
  const ShopPage({super.key, required this.shop});

  final ShopRepository shop;

  @override
  State<ShopPage> createState() => _ShopPageState();
}

class _ShopPageState extends State<ShopPage> {
  late Future<List<Product>> _products;
  String _category = "All";

  @override
  void initState() {
    super.initState();
    _products = widget.shop.products();
  }

  Future<void> _preview(Product product) async {
    var quantity = 1;
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF191D17),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.all(20),
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.network(widget.shop.imageUrl(product.imagePath), height: 220, fit: BoxFit.cover),
                  ),
                  const SizedBox(height: 16),
                  Text(product.category.toUpperCase(), style: const TextStyle(color: Color(0xFFA3AAA0), letterSpacing: 1.4)),
                  Text(product.name, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 8),
                  Text(money(product.priceCents), style: const TextStyle(color: Color(0xFFD6FF4A), fontSize: 22)),
                  const SizedBox(height: 8),
                  Text(product.description),
                  const SizedBox(height: 12),
                  for (final spec in product.specs) Text("• $spec"),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      IconButton(
                        onPressed: quantity > 1 ? () => setSheetState(() => quantity -= 1) : null,
                        icon: const Icon(Icons.remove),
                      ),
                      Text("$quantity"),
                      IconButton(
                        onPressed: quantity < 10 ? () => setSheetState(() => quantity += 1) : null,
                        icon: const Icon(Icons.add),
                      ),
                      const Spacer(),
                      FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text("Add to cart"),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
    if (added != true) return;
    if (Supabase.instance.client.auth.currentUser == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Sign in with the same Google account as the website before adding to the shared cart.")),
        );
      }
      return;
    }
    final current = await widget.shop.cart();
    final existing = current.where((line) => line.product.id == product.id);
    final already = existing.isEmpty ? 0 : existing.first.quantity;
    final next = already + quantity;
    await widget.shop.setQuantity(product.id, next > 10 ? 10 : next);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Added ${product.name}")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Product>>(
      future: _products,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text("Could not load the shop. ${snapshot.error}")));
        }
        final products = snapshot.data ?? const <Product>[];
        final categories = ["All", ...products.map((product) => product.category).toSet()];
        final visible = products.where((product) => _category == "All" || product.category == _category).toList();
        return RefreshIndicator(
          onRefresh: () async => setState(() => _products = widget.shop.products()),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text("Tools for the way you play.", style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              const Text("Same catalog, cart, and orders as the website when you use the same Google account. For players 18 and older."),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: [
                  for (final category in categories)
                    ChoiceChip(
                      label: Text(category),
                      selected: _category == category,
                      onSelected: (_) => setState(() => _category = category),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              for (final product in visible) ...[
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: () => _preview(product),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Image.network(widget.shop.imageUrl(product.imagePath), height: 180, width: double.infinity, fit: BoxFit.cover),
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Expanded(child: Text(product.name, style: Theme.of(context).textTheme.titleLarge)),
                              Text(money(product.priceCents), style: const TextStyle(color: Color(0xFFD6FF4A))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ],
          ),
        );
      },
    );
  }
}

class CartPage extends StatefulWidget {
  const CartPage({super.key, required this.shop, required this.signedIn, required this.onSignIn});

  final ShopRepository shop;
  final bool signedIn;
  final Future<void> Function() onSignIn;

  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  late Future<List<CartLine>> _cart;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _cart = widget.shop.cart();
    _timer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (widget.signedIn && mounted) _reload();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didUpdateWidget(CartPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.signedIn != widget.signedIn) _reload();
  }

  void _reload() => setState(() => _cart = widget.shop.cart());

  Future<void> _change(CartLine line, int quantity) async {
    await widget.shop.setQuantity(line.product.id, quantity);
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.signedIn) {
      return _SignedOut(message: "Sign in to see the cart saved on your account.", onSignIn: widget.onSignIn);
    }
    return FutureBuilder<List<CartLine>>(
      future: _cart,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
        if (snapshot.hasError) return Center(child: Text("Could not load the cart. ${snapshot.error}"));
        final lines = snapshot.data ?? const <CartLine>[];
        final total = lines.fold<int>(0, (sum, line) => sum + line.product.priceCents * line.quantity);
        if (lines.isEmpty) return const Center(child: Text("Your shared cart is empty."));
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            for (final line in lines)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(widget.shop.imageUrl(line.product.imagePath), width: 64, height: 64, fit: BoxFit.cover),
                ),
                title: Text(line.product.name),
                subtitle: Text(money(line.product.priceCents)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(onPressed: () => _change(line, line.quantity - 1), icon: const Icon(Icons.remove)),
                    Text("${line.quantity}"),
                    IconButton(onPressed: line.quantity < 10 ? () => _change(line, line.quantity + 1) : null, icon: const Icon(Icons.add)),
                  ],
                ),
              ),
            const SizedBox(height: 12),
            Text(money(total), style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () async {
                final placed = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(builder: (_) => CheckoutPage(shop: widget.shop, lines: lines, totalCents: total)),
                );
                if (placed == true) _reload();
              },
              child: const Text("Checkout"),
            ),
          ],
        );
      },
    );
  }
}

class CheckoutPage extends StatefulWidget {
  const CheckoutPage({super.key, required this.shop, required this.lines, required this.totalCents});

  final ShopRepository shop;
  final List<CartLine> lines;
  final int totalCents;

  @override
  State<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  var _pending = false;
  String? _error;

  Future<void> _place() async {
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      final orderId = await widget.shop.placeOrder(widget.lines);
      if (!mounted) return;
      await Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => OrderDetailPage(shop: widget.shop, orderId: orderId)),
      );
    } catch (error) {
      setState(() {
        _pending = false;
        _error = "The order could not be saved. $error";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = Supabase.instance.client.auth.currentUser?.email ?? "your Google account";
    return Scaffold(
      appBar: AppBar(title: const Text("Checkout")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text("Signed in as $email"),
          const SizedBox(height: 8),
          const Text("Place the order to save it on this account. It will show on the website too."),
          const SizedBox(height: 16),
          for (final line in widget.lines)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(line.product.name),
              subtitle: Text("Qty ${line.quantity}"),
              trailing: Text(money(line.product.priceCents * line.quantity)),
            ),
          const SizedBox(height: 12),
          Text(money(widget.totalCents), style: Theme.of(context).textTheme.headlineSmall),
          if (_error != null) ...[const SizedBox(height: 12), Text(_error!, style: const TextStyle(color: Color(0xFFFF4D1C)))],
          const SizedBox(height: 16),
          FilledButton(onPressed: _pending ? null : _place, child: Text(_pending ? "Saving order…" : "Place order")),
        ],
      ),
    );
  }
}

class OrdersPage extends StatefulWidget {
  const OrdersPage({super.key, required this.shop, required this.signedIn, required this.onSignIn});

  final ShopRepository shop;
  final bool signedIn;
  final Future<void> Function() onSignIn;

  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> {
  late Future<List<ShopOrder>> _orders;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _orders = widget.shop.orders();
    _timer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (widget.signedIn && mounted) setState(() => _orders = widget.shop.orders());
    });
  }

  @override
  void didUpdateWidget(OrdersPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.signedIn != widget.signedIn) {
      setState(() => _orders = widget.shop.orders());
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.signedIn) {
      return _SignedOut(message: "Sign in to see orders from this account, including ones placed on the website.", onSignIn: widget.onSignIn);
    }
    return FutureBuilder<List<ShopOrder>>(
      future: _orders,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done && !snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) return Center(child: Text("Could not load orders. ${snapshot.error}"));
        final orders = snapshot.data ?? const <ShopOrder>[];
        if (orders.isEmpty) return const Center(child: Text("No orders yet."));
        return RefreshIndicator(
          onRefresh: () async => setState(() => _orders = widget.shop.orders()),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final order in orders)
                Card(
                  child: ListTile(
                    title: Text(order.createdAt.toString()),
                    subtitle: Text("${order.items.length} item(s) · ${order.status}"),
                    trailing: Text(money(order.totalCents)),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => OrderDetailPage(shop: widget.shop, orderId: order.id)),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class OrderDetailPage extends StatelessWidget {
  const OrderDetailPage({super.key, required this.shop, required this.orderId});

  final ShopRepository shop;
  final String orderId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Order saved")),
      body: FutureBuilder<List<ShopOrder>>(
        future: shop.orders(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          ShopOrder? order;
          for (final item in snapshot.data!) {
            if (item.id == orderId) order = item;
          }
          if (order == null) return const Center(child: Text("This order is not on the account."));
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(order.createdAt.toString(), style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              const Text("Saved for this Google account. Open the website with the same sign-in and it will be listed there too."),
              const SizedBox(height: 16),
              for (final item in order.items)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text("${item.quantity} × ${item.name}"),
                  trailing: Text(money(item.unitPriceCents * item.quantity)),
                ),
              Text(money(order.totalCents), style: Theme.of(context).textTheme.headlineSmall),
            ],
          );
        },
      ),
    );
  }
}

class _SignedOut extends StatelessWidget {
  const _SignedOut({required this.message, required this.onSignIn});

  final String message;
  final Future<void> Function() onSignIn;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onSignIn, child: const Text("Sign in with Google")),
          ],
        ),
      ),
    );
  }
}
