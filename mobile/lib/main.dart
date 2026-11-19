import 'package:material_ui/material_ui.dart';

import 'app.dart';
import 'core/api_client.dart';
import 'core/auth_state.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient();
  final auth = AuthState(api)..restore();
  runApp(InstaSquadApp(api: api, auth: auth));
}
