import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon, CloseIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { db } from '@/services/database';
import { useApp } from '@/contexts/AppContext';
import type { ExpenseType } from '@/types/database';

interface ExpenseTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingType: ExpenseType | null;
  onSuccess: (createdType?: ExpenseType) => void;
}

export function ExpenseTypeModal({
  isOpen,
  onClose,
  editingType,
  onSuccess,
}: ExpenseTypeModalProps) {
  const { t } = useTranslation();
  const { user } = useApp();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (editingType) {
      setName(editingType.name);
    } else {
      setName('');
    }
  }, [editingType, isOpen]);

  const handleSubmit = async () => {
    if (!user || !name.trim()) {
      Alert.alert(t('common.error'), t('validation.required'));
      return;
    }

    try {
      setLoading(true);

      if (editingType) {
        // Update existing type
        await db.updateExpenseType(editingType.id, name.trim());
        Alert.alert(t('common.success'), t('messages.expenseTypeUpdated'));
        setName('');
        onSuccess();
        onClose();
      } else {
        // Create new type
        const createdType = await db.createExpenseType({
          name: name.trim(),
          user_id: user.id,
        });
        Alert.alert(t('common.success'), t('messages.expenseTypeAdded'));
        setName('');
        onSuccess(createdType);
        onClose();
      }
    } catch (error) {
      console.error('Failed to save expense type:', error);
      Alert.alert(t('common.error'), 'Failed to save expense type');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!editingType) return;

    Alert.alert(
      t('common.delete'),
      t('messages.deleteExpenseTypeConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await db.deleteExpenseType(editingType.id);
              Alert.alert(t('common.success'), t('messages.expenseTypeDeleted'));
              onSuccess();
              onClose();
            } catch (error) {
              console.error('Failed to delete expense type:', error);
              Alert.alert(t('common.error'), 'Failed to delete expense type');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="max-w-[400px]">
        <ModalHeader>
          <Heading size="md">
            {editingType
              ? t('expenses.editExpenseType')
              : t('expenses.addExpenseType')}
          </Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="md">
            <VStack space="xs">
              <Text className="font-semibold">{t('expenses.expenseTypeName')} *</Text>
              <Input>
                <InputField
                  placeholder={t('expenses.expenseTypeName')}
                  value={name}
                  onChangeText={setName}
                />
              </Input>
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <VStack space="sm" className="w-full">
            {editingType && (
              <Button
                variant="outline"
                className="w-full border-error-500"
                onPress={handleDelete}
                isDisabled={deleting || loading}
              >
                <ButtonText className="text-error-600">
                  {deleting ? t('common.loading') : t('common.delete')}
                </ButtonText>
              </Button>
            )}
            <HStack space="md" className="w-full">
              <Button
                variant="outline"
                className="flex-1"
                onPress={onClose}
                isDisabled={loading || deleting}
              >
                <ButtonText>{t('common.cancel')}</ButtonText>
              </Button>
              <Button
                className="flex-1"
                onPress={handleSubmit}
                isDisabled={!name.trim() || loading || deleting}
              >
                <ButtonText>
                  {loading
                    ? t('common.loading')
                    : editingType
                    ? t('common.save')
                    : t('common.add')}
                </ButtonText>
              </Button>
            </HStack>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

