package com.campusride.driver

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.campusride.driver.tracking.TrackingState
import com.campusride.driver.ui.DriverViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF00836B))) { DriverScreen() } }
    }
    @OptIn(ExperimentalMaterial3Api::class)
    @Composable private fun DriverScreen(model: DriverViewModel = viewModel()) {
        val state by model.state.collectAsStateWithLifecycle()
        val tracking by TrackingState.status.collectAsStateWithLifecycle()
        var driverId by rememberSaveable { mutableStateOf("") }
        var password by remember { mutableStateOf("") }
        var stopDialog by remember { mutableStateOf(false) }
        val permissions = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
            if (granted[Manifest.permission.ACCESS_FINE_LOCATION] == true) { if (state.active) model.resumeTracking() else model.startTrip() }
            else model.permissionDenied()
        }
        fun ensurePermission() {
            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                if (state.active) model.resumeTracking() else model.startTrip()
            } else {
                val requested = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                if (Build.VERSION.SDK_INT >= 33) requested += Manifest.permission.POST_NOTIFICATIONS
                permissions.launch(requested.toTypedArray())
            }
        }
        Scaffold(topBar = { TopAppBar(title = { Text("IIIT BusPulse Driver") }, navigationIcon = { Icon(Icons.Default.DirectionsBus, contentDescription = null, modifier = Modifier.padding(16.dp)) }, actions = {
            if (state.signedIn) IconButton(onClick = model::logout, enabled = !state.active && !state.busy) { Icon(Icons.Default.Logout, "Sign out") }
        }) }) { padding ->
            Column(Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                if (!state.signedIn) {
                    Text("Welcome aboard.", style = MaterialTheme.typography.headlineMedium)
                    Text("Sign in to your assigned college bus.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(value = driverId, onValueChange = { driverId = it }, label = { Text("Driver ID") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
                    Button(onClick = { model.login(driverId, password); password = "" }, enabled = !state.busy && driverId.isNotBlank() && password.length >= 8, modifier = Modifier.fillMaxWidth()) { Text("Sign in") }
                } else {
                    val bus = state.bus
                    if (bus == null) { Text("No bus assigned", style = MaterialTheme.typography.headlineSmall); Text("Contact the campus transport administrator.") }
                    else {
                        Text("Bus ${bus.busNumber}", style = MaterialTheme.typography.headlineLarge)
                        Text(bus.vehicleNumber, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        HorizontalDivider()
                        Text(bus.route.name, style = MaterialTheme.typography.titleLarge)
                        Text("${bus.route.source} → ${bus.route.destination}")
                        Text(if (state.active) "TRIP ACTIVE" else "READY FOR DEPARTURE", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
                        if (state.active) {
                            Text(tracking, style = MaterialTheme.typography.bodySmall)
                            OutlinedButton(onClick = { ensurePermission() }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.MyLocation, null); Spacer(Modifier.width(8.dp)); Text("Resume GPS tracking") }
                            Button(onClick = { stopDialog = true }, enabled = !state.busy, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error), modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Stop, null); Spacer(Modifier.width(8.dp)); Text("Stop trip") }
                        } else Button(onClick = { ensurePermission() }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.PlayArrow, null); Spacer(Modifier.width(8.dp)); Text("Start trip") }
                        Text("Assigned stops", style = MaterialTheme.typography.titleMedium)
                        bus.route.stops.forEach { stop -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) { Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.primary); Text("${stop.sequenceNumber}. ${stop.stopName}") } }
                    }
                    TextButton(onClick = model::refresh, enabled = !state.busy) { Icon(Icons.Default.Refresh, null); Spacer(Modifier.width(8.dp)); Text("Refresh assignment") }
                }
                if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        }
        if (stopDialog) AlertDialog(onDismissRequest = { stopDialog = false }, title = { Text("End this trip?") }, text = { Text("Students will no longer receive a live position for this bus.") }, confirmButton = { TextButton(onClick = { stopDialog = false; model.stopTrip() }) { Text("End trip") } }, dismissButton = { TextButton(onClick = { stopDialog = false }) { Text("Cancel") } })
    }
}