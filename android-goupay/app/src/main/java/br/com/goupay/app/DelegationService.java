package br.com.goupay.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import java.util.Locale;

public class DelegationService extends
        com.google.androidbrowserhelper.trusted.DelegationService {
    private static final String SALE_CHANNEL_ID = "goupay_approved_sales_v2";
    private static final String APP_ORIGIN = "https://goupay.com.br";
    private static final long[] SALE_VIBRATION = new long[]{0, 180, 80, 180, 80, 260};

    @Override
    public void onCreate() {
        super.onCreate();
        createSaleNotificationChannel();
    }

    @Override
    public boolean onNotifyNotificationWithChannel(
            String platformTag,
            int platformId,
            Notification notification,
            String channelName
    ) {
        boolean saleNotification = isSaleNotification(platformTag, notification);
        String destination = destinationFor(notification, saleNotification);

        notification.contentIntent = createAppPendingIntent(destination, platformTag, platformId);
        notification.flags |= Notification.FLAG_AUTO_CANCEL;

        if (!saleNotification) {
            return super.onNotifyNotificationWithChannel(
                    platformTag,
                    platformId,
                    notification,
                    channelName
            );
        }

        NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return false;

        createSaleNotificationChannel();

        Notification saleAlert = notification;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            saleAlert = Notification.Builder
                    .recoverBuilder(this, notification)
                    .setChannelId(SALE_CHANNEL_ID)
                    .setContentIntent(notification.contentIntent)
                    .setAutoCancel(true)
                    .build();
        } else {
            saleAlert.sound = getSaleSoundUri();
            saleAlert.audioAttributes = getSaleAudioAttributes();
            saleAlert.vibrate = SALE_VIBRATION;
            saleAlert.priority = Notification.PRIORITY_HIGH;
        }

        try {
            manager.notify(platformTag, platformId, saleAlert);
            return true;
        } catch (SecurityException permissionDenied) {
            return false;
        }
    }

    private void createSaleNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(SALE_CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                SALE_CHANNEL_ID,
                getString(R.string.saleNotificationChannelName),
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(getString(R.string.saleNotificationChannelDescription));
        channel.enableVibration(true);
        channel.setVibrationPattern(SALE_VIBRATION);
        channel.setSound(getSaleSoundUri(), getSaleAudioAttributes());
        channel.setShowBadge(true);
        manager.createNotificationChannel(channel);
    }

    private Uri getSaleSoundUri() {
        String resourceName = getResources().getResourceEntryName(R.raw.goupay_sale);
        return Uri.parse(
                ContentResolver.SCHEME_ANDROID_RESOURCE + "://" +
                        getPackageName() + "/raw/" + resourceName
        );
    }

    private AudioAttributes getSaleAudioAttributes() {
        return new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
    }

    private boolean isSaleNotification(String platformTag, Notification notification) {
        String tag = platformTag == null ? "" : platformTag.toLowerCase(Locale.ROOT);
        String title = notificationTitle(notification).toLowerCase(Locale.ROOT);
        return tag.contains("sale-") ||
                tag.contains("sale_") ||
                title.contains("venda aprovada");
    }

    private String destinationFor(Notification notification, boolean saleNotification) {
        if (saleNotification) return "/dashboard/sales";

        String title = notificationTitle(notification).toLowerCase(Locale.ROOT);
        if (title.contains("saque")) return "/admin/withdrawals";
        if (title.contains("taxa")) return "/admin/transactions";
        if (title.contains("cobrança") || title.contains("cobranca")) {
            return "/dashboard/billings";
        }
        return "/dashboard";
    }

    private String notificationTitle(Notification notification) {
        Bundle extras = notification.extras;
        if (extras == null) return "";
        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        return title == null ? "" : title.toString();
    }

    private PendingIntent createAppPendingIntent(String path, String platformTag, int platformId) {
        Intent intent = new Intent(this, LauncherActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse(APP_ORIGIN + path));
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int requestCode = (String.valueOf(platformTag) + platformId + path).hashCode();
        return PendingIntent.getActivity(
                this,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

}
