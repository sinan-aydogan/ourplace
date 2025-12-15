import React from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export default function ReportsPage() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Box className="flex-1 bg-background-0">
        <VStack className="p-4 flex-1 justify-center items-center" space="md">
          <Heading size="xl">{t('statistics.title')}</Heading>
          <Text className="text-center text-typography-500">
            Reports feature coming soon...
          </Text>
        </VStack>
      </Box>
    </SafeAreaView>
  );
}
