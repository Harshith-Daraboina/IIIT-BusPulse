# IIIT BusPulse Driver

Native Kotlin driver application for the Smart College Bus Tracking System.

- MVVM: Compose screen -> `DriverViewModel` -> `DriverRepository` -> Retrofit.
- Foreground location service uses FusedLocationProviderClient with a five-second requested interval.
- Converts speed from m/s to km/h and sends actual GPS fix timestamps.
- Drops stale/inaccurate fixes rather than replaying them after reconnect.
- AES-GCM tokens use a non-exportable Android Keystore key. Backup and release cleartext traffic are disabled.
- Stops the location service only after the server confirms trip completion. Failed stop requests can be retried.
- Reconciles assigned bus and active trip on sign-in/refresh; explicit resume is required after process death.

Open this directory in Android Studio. See [deployment instructions](../docs/deployment.md) for JDK/SDK/Gradle versions, API origin, signing, and device test requirements. This repository does not include a verified APK or generated Gradle wrapper.

```text
app/src/main/java/com/campusride/driver/
  DriverApplication.kt       Application-scoped dependency graph
  MainActivity.kt            Compose login and driver workspace
  data/
    DriverApi.kt             DTOs and API contracts
    DriverRepository.kt      Retrofit and JWT interceptor
    TokenStore.kt            Android Keystore encrypted storage
  tracking/
    LocationService.kt       Foreground GPS and network retry loop
  ui/
    DriverViewModel.kt       Login, assignment, start/stop state
```